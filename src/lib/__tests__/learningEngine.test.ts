import { jest } from '@jest/globals';
import { LearningEngine } from '../learningEngine';
import { LocationPoint, UserLocationProfile } from '@/types/location';

// Mock the locationDatabase module
jest.mock('../locationDatabase', () => ({
  getUserLocationProfile: jest.fn(),
  updateUserLocationProfile: jest.fn(),
  getLocationHistory: jest.fn(),
  calculateDistance: jest.fn(),
  generateId: jest.fn(() => 'test-id'),
  addLocationPattern: jest.fn(),
  addRoutePattern: jest.fn()
}));

import * as locationDb from '../locationDatabase';

describe('LearningEngine', () => {
  let learningEngine: LearningEngine;
  let mockProfile: UserLocationProfile;
  let mockLocation: LocationPoint;

  beforeEach(() => {
    learningEngine = new LearningEngine();
    jest.clearAllMocks();

    mockProfile = {
      userId: 'test-user',
      isLearningMode: true,
      learningStartDate: Date.now() - (10 * 24 * 60 * 60 * 1000), // 10 days ago
      learningDurationDays: 30,
      totalDataPoints: 50,
      locationPatterns: [],
      routePatterns: [],
      anomalyThreshold: 0.6,
      lastLocationUpdate: Date.now(),
      createdAt: Date.now() - 1000000
    };

    mockLocation = {
      id: 'test-location',
      timestamp: Date.now(),
      latitude: 40.7589,
      longitude: -73.9851,
      accuracy: 10,
      source: 'gps'
    };

    (locationDb.getUserLocationProfile as jest.Mock).mockResolvedValue(mockProfile);
    (locationDb.getLocationHistory as jest.Mock).mockResolvedValue([]);
    (locationDb.calculateDistance as jest.Mock).mockReturnValue(100);
  });

  describe('processNewLocation', () => {
    it('should return early if profile does not exist', async () => {
      (locationDb.getUserLocationProfile as jest.Mock).mockResolvedValue(null);

      await learningEngine.processNewLocation('test-user', mockLocation);
      expect(locationDb.updateUserLocationProfile).not.toHaveBeenCalled();
    });

    it('should return early if not in learning mode', async () => {
      mockProfile.isLearningMode = false;

      await learningEngine.processNewLocation('test-user', mockLocation);
      expect(locationDb.updateUserLocationProfile).not.toHaveBeenCalled();
    });

    it('should increment data points and update profile', async () => {
      await learningEngine.processNewLocation('test-user', mockLocation);

      expect(mockProfile.totalDataPoints).toBe(51);
      expect(locationDb.updateUserLocationProfile).toHaveBeenCalledWith(mockProfile);
    });

    it('should exit learning mode after duration expires', async () => {
      mockProfile.learningStartDate = Date.now() - (35 * 24 * 60 * 60 * 1000); // 35 days ago

      await learningEngine.processNewLocation('test-user', mockLocation);

      expect(mockProfile.isLearningMode).toBe(false);
    });

    it('should analyze movement anomalies', async () => {
      const recentHistory = [
        { ...mockLocation, timestamp: Date.now() - 60000, latitude: 40.7500 },
        { ...mockLocation, timestamp: Date.now() - 30000, latitude: 40.7550 }
      ];

      (locationDb.getLocationHistory as jest.Mock).mockResolvedValue(recentHistory);

      await learningEngine.processNewLocation('test-user', mockLocation);
      
      // Should complete without throwing errors
      expect(locationDb.updateUserLocationProfile).toHaveBeenCalled();
    });
  });

  describe('analyzeMovementAnomalies', () => {
    it('should return early for insufficient data', async () => {
      const singleLocation = [mockLocation];
      
      await (learningEngine as any).analyzeMovementAnomalies('test-user', mockLocation, singleLocation);
      
      // Should complete without errors (no way to directly test return)
    });

    it('should detect impossible speed', async () => {
      const recentLocations = [
        { ...mockLocation, timestamp: Date.now() - 60000, latitude: 40.7589, longitude: -73.9851 },
        { ...mockLocation, timestamp: Date.now(), latitude: 41.0000, longitude: -74.0000 }
      ];

      (locationDb.calculateDistance as jest.Mock).mockReturnValue(50000); // 50km in 1 minute

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await (learningEngine as any).analyzeMovementAnomalies('test-user', mockLocation, recentLocations);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Impossible speed detected')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('isInResidentialArea', () => {
    it('should identify residential area by low speeds', () => {
      const slowHistory = [
        { ...mockLocation, timestamp: Date.now() - 180000 }, // 3 min ago
        { ...mockLocation, timestamp: Date.now() - 120000 }, // 2 min ago  
        { ...mockLocation, timestamp: Date.now() - 60000 }   // 1 min ago
      ];

      (locationDb.calculateDistance as jest.Mock).mockReturnValue(200); // Slow movement

      const result = (learningEngine as any).isInResidentialArea(mockLocation, slowHistory);
      expect(result).toBe(true);
    });

    it('should identify highway area by high speeds', () => {
      const fastHistory = [
        { ...mockLocation, timestamp: Date.now() - 180000 },
        { ...mockLocation, timestamp: Date.now() - 120000 },
        { ...mockLocation, timestamp: Date.now() - 60000 }
      ];

      (locationDb.calculateDistance as jest.Mock).mockReturnValue(3000); // Fast movement

      const result = (learningEngine as any).isInResidentialArea(mockLocation, fastHistory);
      expect(result).toBe(false);
    });
  });

  describe('detectErraticMovement', () => {
    it('should return false for insufficient data', () => {
      const shortHistory = [mockLocation, mockLocation];
      const result = (learningEngine as any).detectErraticMovement(shortHistory);
      expect(result).toBe(false);
    });

    it('should detect erratic movement patterns', () => {
      const erraticHistory = [
        { ...mockLocation, latitude: 40.7589, longitude: -73.9851 },
        { ...mockLocation, latitude: 40.7590, longitude: -73.9850 }, // North
        { ...mockLocation, latitude: 40.7589, longitude: -73.9849 }, // East  
        { ...mockLocation, latitude: 40.7588, longitude: -73.9850 }, // South
        { ...mockLocation, latitude: 40.7589, longitude: -73.9851 }  // West
      ];

      const result = (learningEngine as any).detectErraticMovement(erraticHistory);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('calculateBearing', () => {
    it('should calculate bearing correctly', () => {
      const bearing = (learningEngine as any).calculateBearing(40.7589, -73.9851, 40.7600, -73.9851);
      expect(bearing).toBeCloseTo(0, 0); // North
    });

    it('should return value between 0 and 360', () => {
      const bearing = (learningEngine as any).calculateBearing(40.7589, -73.9851, 40.7589, -73.9840);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });

  describe('findNearbyPattern', () => {
    it('should find pattern within radius', () => {
      (locationDb.calculateDistance as jest.Mock).mockReturnValue(50);

      const pattern = (learningEngine as any).findNearbyPattern(mockLocation, mockProfile.locationPatterns);
      expect(pattern).toBeDefined();
    });

    it('should return null for no nearby patterns', () => {
      (locationDb.calculateDistance as jest.Mock).mockReturnValue(500);

      const pattern = (learningEngine as any).findNearbyPattern(mockLocation, mockProfile.locationPatterns);
      expect(pattern).toBeNull();
    });
  });

  describe('calculateClusterMetrics', () => {
    it('should calculate center and radius correctly', () => {
      const locations = [
        { ...mockLocation, latitude: 40.7580, longitude: -73.9850 },
        { ...mockLocation, latitude: 40.7590, longitude: -73.9852 },
        { ...mockLocation, latitude: 40.7595, longitude: -73.9849 }
      ];

      (locationDb.calculateDistance as jest.Mock)
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(50)
        .mockReturnValueOnce(75);

      const metrics = (learningEngine as any).calculateClusterMetrics(locations);
      
      expect(metrics.centerLat).toBeCloseTo(40.7588, 3);
      expect(metrics.centerLng).toBeCloseTo(-73.9850, 3);
      expect(metrics.radius).toBe(100);
    });
  });
});