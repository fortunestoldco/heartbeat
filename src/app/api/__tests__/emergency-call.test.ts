import { jest } from '@jest/globals';
import { POST } from '../emergency-call/route';
import { NextRequest } from 'next/server';

// Mock Twilio
const mockTwilioCalls = {
  create: jest.fn()
};

const mockTwilioClient = jest.fn(() => ({
  calls: mockTwilioCalls
}));

jest.mock('twilio', () => mockTwilioClient);

describe('/api/emergency-call', () => {
  let mockRequest: Partial<NextRequest>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      json: jest.fn()
    };

    // Set up mock environment
    process.env = {
      ...originalEnv,
      TWILIO_ACCOUNT_SID: 'test-account-sid',
      TWILIO_AUTH_TOKEN: 'test-auth-token',
      TWILIO_PHONE_NUMBER: '+1234567890',
      EMERGENCY_CONTACT_PHONE: '+1987654321'
    };

    mockTwilioCalls.create.mockResolvedValue({
      sid: 'test-call-sid'
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('POST', () => {
    it('should initiate emergency call successfully', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        reason: 'mesh_network_failure',
        message: 'Test emergency call',
        timestamp: Date.now()
      });

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.callSid).toBe('test-call-sid');

      expect(mockTwilioClient).toHaveBeenCalledWith('test-account-sid', 'test-auth-token');
      expect(mockTwilioCalls.create).toHaveBeenCalledWith({
        twiml: expect.stringContaining('Test emergency call'),
        to: '+1987654321',
        from: '+1234567890',
        timeout: 30,
        record: false
      });
    });

    it('should return 503 when Twilio credentials missing', async () => {
      delete process.env.TWILIO_AUTH_TOKEN;

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Voice service not configured');
    });

    it('should return 503 when phone numbers missing', async () => {
      delete process.env.TWILIO_PHONE_NUMBER;

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Emergency contacts not configured');
    });

    it('should handle Twilio API errors', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        reason: 'test',
        message: 'Test message',
        timestamp: Date.now()
      });

      mockTwilioCalls.create.mockRejectedValue(new Error('Twilio API error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to initiate emergency call');

      consoleSpy.mockRestore();
    });

    it('should generate proper TwiML content', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        reason: 'mesh_network_failure',
        message: 'Network compromised',
        timestamp: Date.now()
      });

      await POST(mockRequest as NextRequest);

      const twimlCall = mockTwilioCalls.create.mock.calls[0][0];
      expect(twimlCall.twiml).toContain('<Response>');
      expect(twimlCall.twiml).toContain('<Say voice="alice"');
      expect(twimlCall.twiml).toContain('Network compromised');
      expect(twimlCall.twiml).toContain('This message will repeat twice');
      expect(twimlCall.twiml).toContain('</Response>');
    });

    it('should log successful call initiation', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        reason: 'test',
        message: 'Test message',
        timestamp: Date.now()
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await POST(mockRequest as NextRequest);

      expect(consoleSpy).toHaveBeenCalledWith('Emergency call initiated: test-call-sid');

      consoleSpy.mockRestore();
    });
  });
});