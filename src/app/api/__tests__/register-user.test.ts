import { jest } from '@jest/globals';
import { POST } from '../register-user/route';
import { NextRequest } from 'next/server';

// Mock the locationDatabase module
jest.mock('@/lib/locationDatabase', () => ({
  createUserLocationProfile: jest.fn(),
  saveLocationSettings: jest.fn(),
  generateId: jest.fn(() => 'test-user-id')
}));

import * as locationDb from '@/lib/locationDatabase';

describe('/api/register-user', () => {
  let mockRequest: Partial<NextRequest>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      json: jest.fn()
    };
  });

  describe('POST', () => {
    it('should register user with location tracking enabled', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        locationPermissionGranted: true
      });

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.userId).toBe('test-user-id');
      expect(data.locationTrackingEnabled).toBe(true);
      expect(data.learningMode).toBe(true);
      
      expect(locationDb.createUserLocationProfile).toHaveBeenCalledWith('test-user-id');
      expect(locationDb.saveLocationSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-id',
          enabled: true,
          anomalyDetection: true,
          autoChallenge: true,
          learningMode: true
        })
      );
    });

    it('should register user without location tracking', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        locationPermissionGranted: false
      });

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.userId).toBe('test-user-id');
      expect(data.locationTrackingEnabled).toBe(false);
      
      expect(locationDb.createUserLocationProfile).not.toHaveBeenCalled();
      expect(locationDb.saveLocationSettings).not.toHaveBeenCalled();
    });

    it('should handle registration errors', async () => {
      (mockRequest.json as jest.Mock).mockRejectedValue(new Error('Invalid JSON'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Registration failed');
      expect(data.details).toBe('Invalid JSON');

      consoleSpy.mockRestore();
    });

    it('should handle database errors during location profile creation', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        locationPermissionGranted: true
      });
      
      (locationDb.createUserLocationProfile as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Registration failed');

      consoleSpy.mockRestore();
    });
  });
});