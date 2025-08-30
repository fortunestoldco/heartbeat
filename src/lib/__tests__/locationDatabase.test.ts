import { jest } from '@jest/globals';
import {
  generateId,
  calculateDistance,
  getUserLocationProfile,
  createUserLocationProfile,
  updateUserLocationProfile,
  getLocationSettings,
  saveLocationSettings,
  saveLocationPoint,
  getLocationHistory,
  addLocationPattern,
  addRoutePattern,
  saveAnomalyEvent,
  updateAnomalyEvent
} from '../locationDatabase';
import { LocationPoint, UserLocationProfile, LocationSettings } from '@/types/location';

// Mock localStorage
const mockLocalStorage = {
  data: {} as Record<string, string>,
  getItem: jest.fn((key: string) => mockLocalStorage.data[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockLocalStorage.data[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockLocalStorage.data[key];
  }),
  clear: jest.fn(() => {
    mockLocalStorage.data = {};
  })
};

// Mock global localStorage
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('locationDatabase', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  describe('generateId', () => {
    it('should generate a unique ID', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });

    it('should generate IDs with consistent format', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      const distance = calculateDistance(40.7589, -73.9851, 40.7505, -73.9934);
      expect(distance).toBeCloseTo(1070, -1); // ~1.07km between these NYC points
    });

    it('should return 0 for identical coordinates', () => {
      const distance = calculateDistance(40.7589, -73.9851, 40.7589, -73.9851);
      expect(distance).toBe(0);
    });

    it('should handle edge cases correctly', () => {
      const distance1 = calculateDistance(0, 0, 0, 0);
      expect(distance1).toBe(0);

      const distance2 = calculateDistance(90, 180, -90, -180);
      expect(distance2).toBeGreaterThan(0);
    });
  });

  describe('getUserLocationProfile', () => {
    it('should return null for non-existent user', async () => {
      const profile = await getUserLocationProfile('nonexistent');
      expect(profile).toBeNull();
    });

    it('should return existing profile', async () => {
      const testProfile: UserLocationProfile = {
        userId: 'test123',
        isLearningMode: true,
        learningStartDate: Date.now(),
        learningDurationDays: 30,
        totalDataPoints: 0,
        locationPatterns: [],
        routePatterns: [],
        anomalyThreshold: 0.7,
        lastLocationUpdate: Date.now(),
        createdAt: Date.now()
      };

      mockLocalStorage.setItem('user-location-profile-test123', JSON.stringify(testProfile));

      const profile = await getUserLocationProfile('test123');
      expect(profile).toEqual(testProfile);
    });
  });

  describe('createUserLocationProfile', () => {
    it('should create a new user profile', async () => {
      const userId = 'newuser123';
      await createUserLocationProfile(userId);

      const profile = await getUserLocationProfile(userId);
      expect(profile).toBeDefined();
      expect(profile?.userId).toBe(userId);
      expect(profile?.isLearningMode).toBe(true);
      expect(profile?.locationPatterns).toEqual([]);
      expect(profile?.routePatterns).toEqual([]);
    });

    it('should not overwrite existing profile', async () => {
      const userId = 'existinguser123';
      await createUserLocationProfile(userId);
      
      const originalProfile = await getUserLocationProfile(userId);
      originalProfile!.totalDataPoints = 50;
      await updateUserLocationProfile(originalProfile!);

      await createUserLocationProfile(userId);
      
      const profile = await getUserLocationProfile(userId);
      expect(profile?.totalDataPoints).toBe(50); // Should remain unchanged
    });
  });

  describe('saveLocationPoint', () => {
    it('should save location point to history', async () => {
      const locationPoint: LocationPoint = {
        id: 'loc123',
        timestamp: Date.now(),
        latitude: 40.7589,
        longitude: -73.9851,
        accuracy: 10,
        source: 'gps'
      };

      await saveLocationPoint(locationPoint);

      const history = await getLocationHistory(locationPoint.id, 24);
      expect(history).toContain(locationPoint);
    });
  });

  describe('getLocationHistory', () => {
    it('should return empty array for no history', async () => {
      const history = await getLocationHistory('nonexistent', 24);
      expect(history).toEqual([]);
    });

    it('should filter by time range', async () => {
      const now = Date.now();
      const oldLocation: LocationPoint = {
        id: 'old',
        timestamp: now - (25 * 60 * 60 * 1000), // 25 hours ago
        latitude: 40.7589,
        longitude: -73.9851,
        accuracy: 10,
        source: 'gps'
      };

      const newLocation: LocationPoint = {
        id: 'new',
        timestamp: now - (1 * 60 * 60 * 1000), // 1 hour ago
        latitude: 40.7505,
        longitude: -73.9934,
        accuracy: 10,
        source: 'gps'
      };

      await saveLocationPoint(oldLocation);
      await saveLocationPoint(newLocation);

      const history = await getLocationHistory('test', 24);
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('new');
    });
  });

  describe('getLocationSettings', () => {
    it('should return default settings for new user', async () => {
      const settings = await getLocationSettings('newuser');
      expect(settings.enabled).toBe(false);
      expect(settings.trackingInterval).toBe(5);
      expect(settings.anomalyDetection).toBe(false);
    });
  });

  describe('saveLocationSettings', () => {
    it('should save and retrieve settings correctly', async () => {
      const settings: LocationSettings = {
        userId: 'testuser',
        enabled: true,
        trackingInterval: 10,
        highAccuracyMode: true,
        backgroundTracking: true,
        anomalyDetection: true,
        autoChallenge: true,
        challengeTimeout: 15,
        learningMode: true,
        privacyMode: false
      };

      await saveLocationSettings(settings);
      const retrieved = await getLocationSettings('testuser');
      
      expect(retrieved).toEqual(settings);
    });
  });
});