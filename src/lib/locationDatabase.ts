import { 
  LocationPoint, 
  LocationPattern, 
  RoutePattern, 
  UserLocationProfile, 
  AnomalyEvent,
  LocationTrackingSettings 
} from '@/types/location';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCATION_DATA_FILE = path.join(DATA_DIR, 'location-data.json');
const USER_PROFILES_FILE = path.join(DATA_DIR, 'user-profiles.json');
const ANOMALIES_FILE = path.join(DATA_DIR, 'anomalies.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'location-settings.json');

interface LocationDatabase {
  locationPoints: LocationPoint[];
  userProfiles: { [userId: string]: UserLocationProfile };
  anomalies: AnomalyEvent[];
  settings: { [userId: string]: LocationTrackingSettings };
}

// Ensure data directory exists
async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Load database
async function loadDatabase(): Promise<LocationDatabase> {
  await ensureDataDir();
  
  const defaultDb: LocationDatabase = {
    locationPoints: [],
    userProfiles: {},
    anomalies: [],
    settings: {}
  };

  try {
    const data = await fs.readFile(LOCATION_DATA_FILE, 'utf8');
    return { ...defaultDb, ...JSON.parse(data) };
  } catch {
    return defaultDb;
  }
}

// Save database
async function saveDatabase(db: LocationDatabase): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(LOCATION_DATA_FILE, JSON.stringify(db, null, 2));
}

// Location tracking functions
export async function saveLocationPoint(point: LocationPoint): Promise<void> {
  const db = await loadDatabase();
  db.locationPoints.push(point);
  
  // Keep only last 10000 points to prevent unbounded growth
  if (db.locationPoints.length > 10000) {
    db.locationPoints = db.locationPoints.slice(-10000);
  }
  
  await saveDatabase(db);
}

export async function getLocationHistory(userId: string, days: number = 30): Promise<LocationPoint[]> {
  const db = await loadDatabase();
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  return db.locationPoints.filter(point => 
    point.timestamp >= cutoff
  );
}

// User profile functions
export async function getUserLocationProfile(userId: string): Promise<UserLocationProfile | null> {
  const db = await loadDatabase();
  return db.userProfiles[userId] || null;
}

export async function createUserLocationProfile(userId: string): Promise<UserLocationProfile> {
  const db = await loadDatabase();
  
  const profile: UserLocationProfile = {
    userId,
    isLearningMode: true,
    learningStartDate: Date.now(),
    learningDurationDays: 30,
    locationPatterns: [],
    routePatterns: [],
    anomalyThreshold: 0.7,
    lastLocationUpdate: 0,
    totalDataPoints: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  db.userProfiles[userId] = profile;
  await saveDatabase(db);
  
  return profile;
}

export async function updateUserLocationProfile(profile: UserLocationProfile): Promise<void> {
  const db = await loadDatabase();
  profile.updatedAt = Date.now();
  db.userProfiles[profile.userId] = profile;
  await saveDatabase(db);
}

// Location pattern functions
export async function addLocationPattern(userId: string, pattern: LocationPattern): Promise<void> {
  const db = await loadDatabase();
  const profile = db.userProfiles[userId];
  
  if (profile) {
    profile.locationPatterns.push(pattern);
    profile.updatedAt = Date.now();
    await saveDatabase(db);
  }
}

export async function addRoutePattern(userId: string, route: RoutePattern): Promise<void> {
  const db = await loadDatabase();
  const profile = db.userProfiles[userId];
  
  if (profile) {
    profile.routePatterns.push(route);
    profile.updatedAt = Date.now();
    await saveDatabase(db);
  }
}

// Anomaly functions
export async function saveAnomalyEvent(anomaly: AnomalyEvent): Promise<void> {
  const db = await loadDatabase();
  db.anomalies.push(anomaly);
  
  // Keep only last 1000 anomalies
  if (db.anomalies.length > 1000) {
    db.anomalies = db.anomalies.slice(-1000);
  }
  
  await saveDatabase(db);
}

export async function getRecentAnomalies(userId: string, days: number = 7): Promise<AnomalyEvent[]> {
  const db = await loadDatabase();
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  return db.anomalies.filter(anomaly => 
    anomaly.userId === userId && anomaly.timestamp >= cutoff
  );
}

export async function updateAnomalyEvent(anomalyId: string, updates: Partial<AnomalyEvent>): Promise<void> {
  const db = await loadDatabase();
  const index = db.anomalies.findIndex(a => a.id === anomalyId);
  
  if (index !== -1) {
    db.anomalies[index] = { ...db.anomalies[index], ...updates };
    await saveDatabase(db);
  }
}

// Settings functions
export async function getLocationSettings(userId: string): Promise<LocationTrackingSettings> {
  const db = await loadDatabase();
  
  return db.settings[userId] || {
    userId,
    enabled: false,
    trackingInterval: 5, // 5 minutes
    highAccuracyMode: true,
    backgroundTracking: true,
    anomalyDetection: true,
    autoChallenge: true,
    challengeTimeout: 10, // 10 minutes
    learningMode: true,
    privacyMode: false
  };
}

export async function saveLocationSettings(settings: LocationTrackingSettings): Promise<void> {
  const db = await loadDatabase();
  db.settings[settings.userId] = settings;
  await saveDatabase(db);
}

// Utility functions
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}