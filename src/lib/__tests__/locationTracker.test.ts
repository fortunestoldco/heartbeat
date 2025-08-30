import { jest } from '@jest/globals';
import { LocationTrackingService, startBrowserLocationTracking, stopBrowserLocationTracking } from '../locationTracker';

// Mock the locationDatabase module
jest.mock('../locationDatabase', () => ({
  generateId: jest.fn(() => 'test-location-id'),
  saveLocationPoint: jest.fn(),
  getLocationSettings: jest.fn()
}));

// Mock the location module
jest.mock('../location', () => ({
  getCurrentLocation: jest.fn()
}));

// Mock the anomalyDetection module
jest.mock('../anomalyDetection', () => ({
  analyzeLocation: jest.fn()
}));

import * as locationDb from '../locationDatabase';
import { getCurrentLocation } from '../location';
import * as anomalyDetection from '../anomalyDetection';

// Mock localStorage for browser utilities
const mockLocalStorage = {
  data: {} as Record<string, string>,
  getItem: jest.fn((key: string) => mockLocalStorage.data[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockLocalStorage.data[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockLocalStorage.data[key];
  })
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('LocationTrackingService', () => {
  let service: LocationTrackingService;

  beforeEach(() => {
    service = new LocationTrackingService();
    jest.clearAllMocks();
    jest.useFakeTimers();

    (locationDb.getLocationSettings as jest.Mock).mockResolvedValue({
      enabled: true,
      trackingInterval: 1, // 1 minute for faster testing
      highAccuracyMode: true
    });

    (getCurrentLocation as jest.Mock).mockResolvedValue({
      latitude: 40.7589,
      longitude: -73.9851,
      accuracy: 10,
      source: 'gps'
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('startTracking', () => {
    it('should start tracking for new user', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.startTracking('test-user');

      expect(service.isTracking('test-user')).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Location tracking started for user test-user');

      consoleSpy.mockRestore();
    });

    it('should not start tracking if already active', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.startTracking('test-user');
      await service.startTracking('test-user'); // Second call

      expect(consoleSpy).toHaveBeenCalledWith('Location tracking already active for user test-user');

      consoleSpy.mockRestore();
    });

    it('should not start tracking if disabled in settings', async () => {
      (locationDb.getLocationSettings as jest.Mock).mockResolvedValue({
        enabled: false
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.startTracking('test-user');

      expect(service.isTracking('test-user')).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Location tracking disabled for user test-user');

      consoleSpy.mockRestore();
    });

    it('should capture location at intervals', async () => {
      await service.startTracking('test-user');

      // Advance timer to trigger interval
      jest.advanceTimersByTime(60000); // 1 minute

      expect(locationDb.saveLocationPoint).toHaveBeenCalled();
      expect(anomalyDetection.analyzeLocation).toHaveBeenCalled();
    });

    it('should handle location capture errors gracefully', async () => {
      (getCurrentLocation as jest.Mock).mockRejectedValue(new Error('GPS error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.startTracking('test-user');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Initial location capture failed for user test-user:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('stopTracking', () => {
    it('should stop tracking for active user', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.startTracking('test-user');
      await service.stopTracking('test-user');

      expect(service.isTracking('test-user')).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Location tracking stopped for user test-user');

      consoleSpy.mockRestore();
    });

    it('should handle stopping non-existent tracker gracefully', async () => {
      await service.stopTracking('nonexistent-user');
      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('getCurrentLocation', () => {
    it('should return last known location for tracked user', async () => {
      await service.startTracking('test-user');

      const location = await service.getCurrentLocation('test-user');
      expect(location).toBeDefined();
      expect(location?.latitude).toBe(40.7589);
    });

    it('should return null for non-tracked user', async () => {
      const location = await service.getCurrentLocation('not-tracked');
      expect(location).toBeNull();
    });
  });

  describe('getTrackingStatus', () => {
    it('should return status for tracked user', async () => {
      await service.startTracking('test-user');

      const status = await service.getTrackingStatus('test-user');
      
      expect(status.isTracking).toBe(true);
      expect(status.lastLocation).toBeDefined();
      expect(status.trackingDuration).toBeGreaterThan(0);
    });

    it('should return not tracking for non-tracked user', async () => {
      const status = await service.getTrackingStatus('not-tracked');
      
      expect(status.isTracking).toBe(false);
      expect(status.lastLocation).toBeUndefined();
      expect(status.trackingDuration).toBeUndefined();
    });
  });

  describe('captureLocation', () => {
    it('should save location point and trigger anomaly detection', async () => {
      await service.startTracking('test-user');

      // Manually trigger location capture
      await (service as any).captureLocation('test-user', true);

      expect(locationDb.saveLocationPoint).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 40.7589,
          longitude: -73.9851,
          accuracy: 10,
          source: 'gps'
        })
      );

      expect(anomalyDetection.analyzeLocation).toHaveBeenCalledWith(
        'test-user',
        expect.any(Object)
      );
    });

    it('should handle geolocation API for additional data', async () => {
      // Mock navigator.geolocation
      const mockGeolocation = {
        getCurrentPosition: jest.fn((success) => {
          success({
            coords: {
              speed: 5.5,
              heading: 180
            }
          });
        })
      };

      Object.defineProperty(global.navigator, 'geolocation', {
        value: mockGeolocation,
        writable: true
      });

      await (service as any).captureLocation('test-user', true);

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });
  });
});

describe('Browser utilities', () => {
  const mockService = {
    startTracking: jest.fn(),
    stopTracking: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.data = {};
    
    // Mock the singleton service
    jest.doMock('../locationTracker', () => ({
      locationTrackingService: mockService
    }));
  });

  describe('startBrowserLocationTracking', () => {
    it('should set localStorage and start tracking', () => {
      // Mock window object
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true
      });

      startBrowserLocationTracking('test-user');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('failsafe-location-tracking', 'true');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('failsafe-tracking-user', 'test-user');
    });
  });

  describe('stopBrowserLocationTracking', () => {
    it('should remove localStorage and stop tracking', () => {
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true
      });

      stopBrowserLocationTracking('test-user');

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('failsafe-location-tracking');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('failsafe-tracking-user');
    });
  });
});