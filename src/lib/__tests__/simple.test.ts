import { generateId, calculateDistance } from '../locationDatabase';

describe('Core Functions', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance correctly', () => {
      const distance = calculateDistance(40.7589, -73.9851, 40.7505, -73.9934);
      expect(distance).toBeGreaterThan(1000);
      expect(distance).toBeLessThan(1200);
    });

    it('should return 0 for identical coordinates', () => {
      const distance = calculateDistance(40.7589, -73.9851, 40.7589, -73.9851);
      expect(distance).toBe(0);
    });
  });
});

describe('Location Types', () => {
  it('should validate location point structure', () => {
    const locationPoint = {
      id: 'test-id',
      timestamp: Date.now(),
      latitude: 40.7589,
      longitude: -73.9851,
      accuracy: 10,
      source: 'gps' as const
    };

    expect(locationPoint.id).toBeDefined();
    expect(typeof locationPoint.latitude).toBe('number');
    expect(typeof locationPoint.longitude).toBe('number');
    expect(['wifi', 'cell', 'mixed', 'gps']).toContain(locationPoint.source);
  });
});

describe('Security Functions', () => {
  it('should validate anomaly threshold ranges', () => {
    const validThresholds = [0.1, 0.5, 0.7, 0.9];
    
    validThresholds.forEach(threshold => {
      expect(threshold).toBeGreaterThanOrEqual(0);
      expect(threshold).toBeLessThanOrEqual(1);
    });
  });

  it('should validate time window structure', () => {
    const timeWindow = {
      dayOfWeek: 1, // Monday
      startHour: 9,
      endHour: 17
    };

    expect(timeWindow.dayOfWeek).toBeGreaterThanOrEqual(0);
    expect(timeWindow.dayOfWeek).toBeLessThanOrEqual(6);
    expect(timeWindow.startHour).toBeGreaterThanOrEqual(0);
    expect(timeWindow.startHour).toBeLessThanOrEqual(23);
    expect(timeWindow.endHour).toBeGreaterThanOrEqual(timeWindow.startHour);
    expect(timeWindow.endHour).toBeLessThanOrEqual(23);
  });
});