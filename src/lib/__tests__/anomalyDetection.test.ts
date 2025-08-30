import { jest } from '@jest/globals';
import { AnomalyDetectionService, analyzeLocation } from '../anomalyDetection';
import { LocationPoint, UserLocationProfile, AnomalyEvent } from '@/types/location';

// Mock the locationDatabase module
jest.mock('../locationDatabase', () => ({
  getUserLocationProfile: jest.fn(),
  saveAnomalyEvent: jest.fn(),
  getLocationSettings: jest.fn(),
  calculateDistance: jest.fn(),
  generateId: jest.fn(() => 'test-id'),
  getLocationHistory: jest.fn(),
  updateAnomalyEvent: jest.fn()
}));

// Mock the learningEngine module
jest.mock('../learningEngine', () => ({
  learningEngine: {
    processNewLocation: jest.fn()
  }
}));

// Mock the challengeService module
jest.mock('../challengeService', () => ({
  issuePinChallenge: jest.fn()
}));

import * as locationDb from '../locationDatabase';
import { learningEngine } from '../learningEngine';
import * as challengeService from '../challengeService';

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;
  let mockProfile: UserLocationProfile;
  let mockLocation: LocationPoint;

  beforeEach(() => {
    service = new AnomalyDetectionService();
    jest.clearAllMocks();

    mockProfile = {
      userId: 'test-user',
      isLearningMode: false,
      learningStartDate: Date.now() - (35 * 24 * 60 * 60 * 1000), // 35 days ago
      learningDurationDays: 30,
      totalDataPoints: 150,
      locationPatterns: [
        {
          id: 'pattern1',
          userId: 'test-user',
          patternType: 'home',
          centerLat: 40.7589,
          centerLng: -73.9851,
          radiusMeters: 100,
          timeWindows: [
            { dayOfWeek: 1, startHour: 18, endHour: 23 },
            { dayOfWeek: 2, startHour: 18, endHour: 23 }
          ],
          frequency: 5,
          confidence: 0.9,
          lastSeen: Date.now(),
          createdAt: Date.now() - 1000000
        }
      ],
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
    (locationDb.getLocationSettings as jest.Mock).mockResolvedValue({
      anomalyDetection: true,
      autoChallenge: true
    });
    (locationDb.calculateDistance as jest.Mock).mockReturnValue(50); // 50m distance
    (locationDb.getLocationHistory as jest.Mock).mockResolvedValue([]);
  });

  describe('analyzeLocation', () => {
    it('should return null when profile does not exist', async () => {
      (locationDb.getUserLocationProfile as jest.Mock).mockResolvedValue(null);

      const result = await service.analyzeLocation('test-user', mockLocation);
      expect(result).toBeNull();
    });

    it('should return null when anomaly detection is disabled', async () => {
      (locationDb.getLocationSettings as jest.Mock).mockResolvedValue({
        anomalyDetection: false
      });

      const result = await service.analyzeLocation('test-user', mockLocation);
      expect(result).toBeNull();
    });

    it('should continue learning during learning mode', async () => {
      mockProfile.isLearningMode = true;
      mockProfile.totalDataPoints = 50;

      await service.analyzeLocation('test-user', mockLocation);
      
      expect(learningEngine.processNewLocation).toHaveBeenCalledWith('test-user', mockLocation);
    });

    it('should skip anomaly detection during early learning mode', async () => {
      mockProfile.isLearningMode = true;
      mockProfile.totalDataPoints = 50; // Less than 100

      const result = await service.analyzeLocation('test-user', mockLocation);
      expect(result).toBeNull();
    });

    it('should detect anomalies when threshold exceeded', async () => {
      // Mock high anomaly score
      (locationDb.calculateDistance as jest.Mock).mockReturnValue(6000); // 6km from known location

      const result = await service.analyzeLocation('test-user', mockLocation);
      
      expect(result).toBeDefined();
      expect(result?.severity).toBe('medium');
      expect(locationDb.saveAnomalyEvent).toHaveBeenCalled();
    });

    it('should trigger security challenge for high-confidence anomalies', async () => {
      (locationDb.calculateDistance as jest.Mock).mockReturnValue(10000); // 10km from known location
      mockLocation.speed = 250; // Impossible speed

      const result = await service.analyzeLocation('test-user', mockLocation);
      
      expect(result?.challengeRequired).toBe(true);
      expect(challengeService.issuePinChallenge).toHaveBeenCalledWith('test-user', result?.id);
    });
  });

  describe('calculateAnomalyScore', () => {
    it('should return low score for familiar location at expected time', async () => {
      const testLocation = {
        ...mockLocation,
        timestamp: new Date().setHours(19, 0, 0, 0) // 7 PM
      };

      // Set to Monday
      jest.spyOn(Date.prototype, 'getDay').mockReturnValue(1);
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(19);

      (locationDb.calculateDistance as jest.Mock).mockReturnValue(50); // Within pattern

      const score = await (service as any).calculateAnomalyScore(testLocation, mockProfile);
      expect(score.score).toBeLessThan(0.3);
      expect(score.severity).toBe('low');
    });

    it('should return high score for unknown location', async () => {
      (locationDb.calculateDistance as jest.Mock).mockReturnValue(10000); // 10km away

      const score = await (service as any).calculateAnomalyScore(mockLocation, mockProfile);
      expect(score.score).toBeGreaterThan(0.5);
      expect(score.factors.length).toBeGreaterThan(0);
    });

    it('should detect impossible speed anomalies', async () => {
      const fastLocation = {
        ...mockLocation,
        speed: 250 // 250 m/s = 900 km/h
      };

      const score = await (service as any).calculateAnomalyScore(fastLocation, mockProfile);
      expect(score.score).toBeGreaterThan(0.8);
      expect(score.severity).toBe('high');
    });
  });

  describe('analyzeLocationFamiliarity', () => {
    it('should return low score for empty patterns', () => {
      const emptyProfile = { ...mockProfile, locationPatterns: [] };
      const score = (service as any).analyzeLocationFamiliarity(mockLocation, emptyProfile.locationPatterns);
      expect(score.score).toBe(0.1);
    });

    it('should return low score for location within known pattern', () => {
      (locationDb.calculateDistance as jest.Mock).mockReturnValue(50); // Within 100m radius

      const score = (service as any).analyzeLocationFamiliarity(mockLocation, mockProfile.locationPatterns);
      expect(score.score).toBeLessThan(0.2);
    });

    it('should return high score for distant location', () => {
      (locationDb.calculateDistance as jest.Mock).mockReturnValue(6000); // 6km away

      const score = (service as any).analyzeLocationFamiliarity(mockLocation, mockProfile.locationPatterns);
      expect(score.score).toBeGreaterThan(0.8);
    });
  });

  describe('analyzeTimeAnomalies', () => {
    it('should return low score for expected time', () => {
      const timeLocation = {
        ...mockLocation,
        timestamp: new Date().setHours(19, 0, 0, 0) // 7 PM Monday
      };

      jest.spyOn(Date.prototype, 'getDay').mockReturnValue(1);
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(19);
      (locationDb.calculateDistance as jest.Mock).mockReturnValue(50);

      const score = (service as any).analyzeTimeAnomalies(timeLocation, mockProfile.locationPatterns);
      expect(score.score).toBe(0.0);
    });

    it('should return high score for unexpected time', () => {
      const timeLocation = {
        ...mockLocation,
        timestamp: new Date().setHours(3, 0, 0, 0) // 3 AM Monday
      };

      jest.spyOn(Date.prototype, 'getDay').mockReturnValue(1);
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(3);
      (locationDb.calculateDistance as jest.Mock).mockReturnValue(50);

      const score = (service as any).analyzeTimeAnomalies(timeLocation, mockProfile.locationPatterns);
      expect(score.score).toBeGreaterThan(0.5);
    });
  });

  describe('analyzeTechnicalAnomalies', () => {
    it('should detect perfect accuracy as suspicious', () => {
      const perfectLocation = { ...mockLocation, accuracy: 0.5 };
      const score = (service as any).analyzeTechnicalAnomalies(perfectLocation);
      expect(score.score).toBeGreaterThan(0.2);
    });

    it('should detect poor accuracy as suspicious', () => {
      const poorLocation = { ...mockLocation, accuracy: 1500 };
      const score = (service as any).analyzeTechnicalAnomalies(poorLocation);
      expect(score.score).toBeGreaterThan(0.3);
    });

    it('should detect impossible coordinates', () => {
      const impossibleLocation = { ...mockLocation, latitude: 95 };
      const score = (service as any).analyzeTechnicalAnomalies(impossibleLocation);
      expect(score.score).toBe(1.0);
    });
  });

  describe('analyzeRecentMovement', () => {
    it('should return low score for insufficient data', async () => {
      (locationDb.getLocationHistory as jest.Mock).mockResolvedValue([mockLocation]);

      const score = await (service as any).analyzeRecentMovement('test-user', mockProfile);
      expect(score).toBe(0.1);
    });

    it('should detect consecutive high speeds', async () => {
      const highSpeedHistory = [
        { ...mockLocation, timestamp: Date.now() - 60000, latitude: 40.7589, longitude: -73.9851 },
        { ...mockLocation, timestamp: Date.now() - 30000, latitude: 40.8000, longitude: -73.9500 },
        { ...mockLocation, timestamp: Date.now(), latitude: 40.8500, longitude: -73.9000 }
      ];

      (locationDb.getLocationHistory as jest.Mock).mockResolvedValue(highSpeedHistory);
      (locationDb.calculateDistance as jest.Mock)
        .mockReturnValueOnce(5000) // High speed segment 1
        .mockReturnValueOnce(5000); // High speed segment 2

      const score = await (service as any).analyzeRecentMovement('test-user', mockProfile);
      expect(score).toBeGreaterThan(0.3);
    });
  });

  describe('detectTeleportation', () => {
    it('should detect teleportation', async () => {
      const distantHistory = [
        { ...mockLocation, timestamp: Date.now() - 30000, latitude: 40.7589, longitude: -73.9851 }
      ];

      (locationDb.getLocationHistory as jest.Mock).mockResolvedValue(distantHistory);
      (locationDb.calculateDistance as jest.Mock).mockReturnValue(50000); // 50km in 30 seconds

      const score = await (service as any).detectTeleportation('test-user', {
        ...mockLocation,
        latitude: 41.0000,
        longitude: -74.0000
      });

      expect(score).toBeGreaterThan(0.7);
    });

    it('should return low score for normal movement', async () => {
      const normalHistory = [
        { ...mockLocation, timestamp: Date.now() - 300000 } // 5 minutes ago
      ];

      (locationDb.getLocationHistory as jest.Mock).mockResolvedValue(normalHistory);
      (locationDb.calculateDistance as jest.Mock).mockReturnValue(1000); // 1km in 5 minutes

      const score = await (service as any).detectTeleportation('test-user', mockLocation);
      expect(score).toBe(0.0);
    });
  });
});