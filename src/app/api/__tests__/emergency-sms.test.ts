import { jest } from '@jest/globals';
import { POST } from '../emergency-sms/route';
import { NextRequest } from 'next/server';

// Mock Twilio
const mockTwilioMessages = {
  create: jest.fn()
};

const mockTwilioClient = jest.fn(() => ({
  messages: mockTwilioMessages
}));

jest.mock('twilio', () => mockTwilioClient);

describe('/api/emergency-sms', () => {
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

    mockTwilioMessages.create.mockResolvedValue({
      sid: 'test-message-sid'
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('POST', () => {
    it('should send emergency SMS successfully', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        reason: 'mesh_network_failure',
        message: 'Test emergency message',
        timestamp: Date.now()
      });

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.messageSid).toBe('test-message-sid');

      expect(mockTwilioClient).toHaveBeenCalledWith('test-account-sid', 'test-auth-token');
      expect(mockTwilioMessages.create).toHaveBeenCalledWith({
        body: '🚨 FAILSAFE ALERT: Test emergency message',
        from: '+1234567890',
        to: '+1987654321'
      });
    });

    it('should return 503 when Twilio credentials missing', async () => {
      delete process.env.TWILIO_ACCOUNT_SID;

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('SMS service not configured');
    });

    it('should return 503 when phone numbers missing', async () => {
      delete process.env.EMERGENCY_CONTACT_PHONE;

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

      mockTwilioMessages.create.mockRejectedValue(new Error('Twilio API error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send emergency SMS');

      consoleSpy.mockRestore();
    });

    it('should handle malformed request body', async () => {
      (mockRequest.json as jest.Mock).mockRejectedValue(new Error('Invalid JSON'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send emergency SMS');

      consoleSpy.mockRestore();
    });

    it('should log successful SMS sending', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        reason: 'test',
        message: 'Test message',
        timestamp: Date.now()
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await POST(mockRequest as NextRequest);

      expect(consoleSpy).toHaveBeenCalledWith('Emergency SMS sent: test-message-sid');

      consoleSpy.mockRestore();
    });
  });
});