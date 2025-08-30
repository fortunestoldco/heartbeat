export interface LocationPoint {
  id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  source: 'wifi' | 'cell' | 'mixed' | 'gps';
  speed?: number;
  heading?: number;
}

export interface LocationPattern {
  id: string;
  userId: string;
  patternType: 'home' | 'work' | 'routine' | 'frequent';
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  timeWindows: TimeWindow[];
  frequency: number; // visits per week
  confidence: number; // 0-1, how confident we are in this pattern
  lastSeen: number;
  createdAt: number;
}

export interface TimeWindow {
  dayOfWeek: number; // 0-6, Sunday = 0
  startHour: number; // 0-23
  endHour: number; // 0-23
}

export interface RoutePattern {
  id: string;
  userId: string;
  startLocationId: string;
  endLocationId: string;
  waypoints: LocationPoint[];
  averageDuration: number; // minutes
  frequency: number; // times per week
  timeWindows: TimeWindow[];
  confidence: number;
  lastUsed: number;
  createdAt: number;
}

export interface UserLocationProfile {
  userId: string;
  isLearningMode: boolean;
  learningStartDate: number;
  learningDurationDays: number; // default 30 days
  locationPatterns: LocationPattern[];
  routePatterns: RoutePattern[];
  anomalyThreshold: number; // 0-1, sensitivity for anomaly detection
  lastLocationUpdate: number;
  totalDataPoints: number;
  createdAt: number;
  updatedAt: number;
}

export interface AnomalyEvent {
  id: string;
  userId: string;
  timestamp: number;
  location: LocationPoint;
  anomalyType: 'unknown_location' | 'unusual_time' | 'unusual_route' | 'speed_anomaly' | 'location_spoofing';
  severity: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  description: string;
  challengeRequired: boolean;
  challengeIssued: boolean;
  challengeCompleted: boolean;
  challengeExpiry?: number;
  resolved: boolean;
  resolvedAt?: number;
}

export interface LocationTrackingSettings {
  userId: string;
  enabled: boolean;
  trackingInterval: number; // minutes
  highAccuracyMode: boolean;
  backgroundTracking: boolean;
  anomalyDetection: boolean;
  autoChallenge: boolean;
  challengeTimeout: number; // minutes, default 10
  learningMode: boolean;
  privacyMode: boolean; // if true, store less detailed data
}