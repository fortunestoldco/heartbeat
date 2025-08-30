import { 
  LocationPoint, 
  LocationPattern, 
  RoutePattern, 
  UserLocationProfile,
  TimeWindow 
} from '@/types/location';
import { 
  getUserLocationProfile, 
  updateUserLocationProfile, 
  getLocationHistory, 
  calculateDistance, 
  generateId, 
  addLocationPattern, 
  addRoutePattern 
} from '@/lib/locationDatabase';

const MIN_VISITS_FOR_PATTERN = 3;
const MIN_PATTERN_RADIUS = 50; // meters
const MAX_PATTERN_RADIUS = 500; // meters
const MIN_TIME_AT_LOCATION = 10; // minutes
const ROUTE_SIMILARITY_THRESHOLD = 0.7;

export class LearningEngine {
  
  async processNewLocation(userId: string, location: LocationPoint): Promise<void> {
    const profile = await getUserLocationProfile(userId);
    
    if (!profile || !profile.isLearningMode) {
      return;
    }

    // Check if learning period has expired
    const learningDuration = Date.now() - profile.learningStartDate;
    const maxLearningDuration = profile.learningDurationDays * 24 * 60 * 60 * 1000;
    
    if (learningDuration > maxLearningDuration) {
      profile.isLearningMode = false;
      console.log(`Learning mode completed for user ${userId}`);
    }

    profile.totalDataPoints += 1;
    profile.lastLocationUpdate = Date.now();
    
    await this.updateLocationPatterns(userId, location, profile);
    await this.updateRoutePatterns(userId, location, profile);
    
    await updateUserLocationProfile(profile);
  }

  private async updateLocationPatterns(
    userId: string, 
    location: LocationPoint, 
    profile: UserLocationProfile
  ): Promise<void> {
    // Find nearby existing patterns
    const nearbyPattern = this.findNearbyPattern(location, profile.locationPatterns);
    
    if (nearbyPattern) {
      // Update existing pattern
      await this.updateExistingPattern(nearbyPattern, location);
    } else {
      // Check if we have enough data to create a new pattern
      const history = await getLocationHistory(userId, 30);
      const clusterLocations = this.findLocationCluster(location, history);
      
      if (clusterLocations.length >= MIN_VISITS_FOR_PATTERN) {
        const newPattern = await this.createLocationPattern(userId, location, clusterLocations);
        if (newPattern) {
          await addLocationPattern(userId, newPattern);
          profile.locationPatterns.push(newPattern);
        }
      }
    }
  }

  private findNearbyPattern(location: LocationPoint, patterns: LocationPattern[]): LocationPattern | null {
    for (const pattern of patterns) {
      const distance = calculateDistance(
        location.latitude, 
        location.longitude,
        pattern.centerLat, 
        pattern.centerLng
      );
      
      if (distance <= pattern.radiusMeters) {
        return pattern;
      }
    }
    return null;
  }

  private findLocationCluster(centerLocation: LocationPoint, history: LocationPoint[]): LocationPoint[] {
    const cluster: LocationPoint[] = [];
    
    for (const point of history) {
      const distance = calculateDistance(
        centerLocation.latitude, 
        centerLocation.longitude,
        point.latitude, 
        point.longitude
      );
      
      if (distance <= MAX_PATTERN_RADIUS) {
        cluster.push(point);
      }
    }
    
    return cluster;
  }

  private async createLocationPattern(
    userId: string, 
    centerLocation: LocationPoint, 
    clusterLocations: LocationPoint[]
  ): Promise<LocationPattern | null> {
    if (clusterLocations.length < MIN_VISITS_FOR_PATTERN) {
      return null;
    }

    // Calculate center and radius
    const { centerLat, centerLng, radius } = this.calculateClusterMetrics(clusterLocations);
    
    if (radius < MIN_PATTERN_RADIUS) {
      return null;
    }

    // Analyze time windows
    const timeWindows = this.analyzeTimeWindows(clusterLocations);
    
    // Determine pattern type
    const patternType = this.determinePatternType(timeWindows, clusterLocations.length);
    
    const pattern: LocationPattern = {
      id: generateId(),
      userId,
      patternType,
      centerLat,
      centerLng,
      radiusMeters: Math.min(radius, MAX_PATTERN_RADIUS),
      timeWindows,
      frequency: this.calculateWeeklyFrequency(clusterLocations),
      confidence: this.calculateConfidence(clusterLocations, timeWindows),
      lastSeen: Date.now(),
      createdAt: Date.now()
    };

    return pattern;
  }

  private calculateClusterMetrics(locations: LocationPoint[]): {
    centerLat: number;
    centerLng: number;
    radius: number;
  } {
    const centerLat = locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length;
    const centerLng = locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length;
    
    const distances = locations.map(loc => 
      calculateDistance(centerLat, centerLng, loc.latitude, loc.longitude)
    );
    
    const radius = Math.max(...distances);
    
    return { centerLat, centerLng, radius };
  }

  private analyzeTimeWindows(locations: LocationPoint[]): TimeWindow[] {
    const timeSlots: { [key: string]: number } = {};
    
    for (const location of locations) {
      const date = new Date(location.timestamp);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      const key = `${dayOfWeek}-${hour}`;
      
      timeSlots[key] = (timeSlots[key] || 0) + 1;
    }

    // Group consecutive hours into windows
    const windows: TimeWindow[] = [];
    const sortedSlots = Object.entries(timeSlots)
      .filter(([, count]) => count >= 2) // At least 2 visits
      .sort(([a], [b]) => a.localeCompare(b));

    let currentWindow: TimeWindow | null = null;
    
    for (const [key, count] of sortedSlots) {
      const [dayStr, hourStr] = key.split('-');
      const dayOfWeek = parseInt(dayStr);
      const hour = parseInt(hourStr);
      
      if (!currentWindow || currentWindow.dayOfWeek !== dayOfWeek || hour > currentWindow.endHour + 1) {
        if (currentWindow) {
          windows.push(currentWindow);
        }
        currentWindow = {
          dayOfWeek,
          startHour: hour,
          endHour: hour
        };
      } else {
        currentWindow.endHour = hour;
      }
    }
    
    if (currentWindow) {
      windows.push(currentWindow);
    }
    
    return windows;
  }

  private determinePatternType(timeWindows: TimeWindow[], visitCount: number): 'home' | 'work' | 'routine' | 'frequent' {
    // Home: Evening/night visits, multiple days
    const hasEveningVisits = timeWindows.some(w => w.startHour >= 18 || w.endHour >= 22);
    const hasNightVisits = timeWindows.some(w => w.startHour >= 22 || w.startHour <= 6);
    
    if ((hasEveningVisits || hasNightVisits) && timeWindows.length >= 3) {
      return 'home';
    }

    // Work: Weekday daytime visits
    const hasWeekdayDaytime = timeWindows.some(w => 
      w.dayOfWeek >= 1 && w.dayOfWeek <= 5 && w.startHour >= 8 && w.endHour <= 18
    );
    
    if (hasWeekdayDaytime && visitCount >= MIN_VISITS_FOR_PATTERN * 2) {
      return 'work';
    }

    // Routine: Regular pattern, same days/times
    if (timeWindows.length >= 2 && visitCount >= MIN_VISITS_FOR_PATTERN * 3) {
      return 'routine';
    }

    return 'frequent';
  }

  private calculateWeeklyFrequency(locations: LocationPoint[]): number {
    if (locations.length === 0) return 0;
    
    const timespan = Math.max(...locations.map(l => l.timestamp)) - Math.min(...locations.map(l => l.timestamp));
    const weeks = timespan / (7 * 24 * 60 * 60 * 1000);
    
    return weeks > 0 ? locations.length / weeks : 0;
  }

  private calculateConfidence(locations: LocationPoint[], timeWindows: TimeWindow[]): number {
    let confidence = 0;
    
    // More locations = higher confidence
    confidence += Math.min(locations.length / 20, 0.4);
    
    // Regular time patterns = higher confidence
    confidence += Math.min(timeWindows.length / 5, 0.3);
    
    // Longer observation period = higher confidence
    if (locations.length > 0) {
      const observationDays = (Math.max(...locations.map(l => l.timestamp)) - 
                              Math.min(...locations.map(l => l.timestamp))) / (24 * 60 * 60 * 1000);
      confidence += Math.min(observationDays / 30, 0.3);
    }
    
    return Math.min(confidence, 1.0);
  }

  private async updateExistingPattern(pattern: LocationPattern, location: LocationPoint): Promise<void> {
    // Update last seen
    pattern.lastSeen = Date.now();
    
    // Update confidence if location is within expected time window
    const locationDate = new Date(location.timestamp);
    const matchesTimeWindow = pattern.timeWindows.some(window => {
      const dayMatch = window.dayOfWeek === locationDate.getDay();
      const hourMatch = locationDate.getHours() >= window.startHour && 
                       locationDate.getHours() <= window.endHour;
      return dayMatch && hourMatch;
    });
    
    if (matchesTimeWindow) {
      pattern.confidence = Math.min(pattern.confidence + 0.01, 1.0);
    }
  }

  private async updateRoutePatterns(
    userId: string, 
    location: LocationPoint, 
    profile: UserLocationProfile
  ): Promise<void> {
    // Route detection requires movement between known patterns
    const history = await getLocationHistory(userId, 2); // Last 2 hours for better route detection
    
    if (history.length < 3) return;
    
    // Analyze recent movement for route patterns
    const recentLocations = history.slice(-20); // Last 20 locations for better route analysis
    const potentialRoute = this.detectRouteInMovement(recentLocations, profile.locationPatterns);
    
    if (potentialRoute && potentialRoute.length >= 2) {
      await this.analyzeAndSaveRoute(userId, potentialRoute, profile);
    }

    // Detect unusual movement speed or trajectory changes
    await this.analyzeMovementAnomalies(userId, location, recentLocations);
  }

  private detectRouteInMovement(
    locations: LocationPoint[], 
    patterns: LocationPattern[]
  ): LocationPoint[] | null {
    // Simplified route detection - look for movement between known patterns
    const route: LocationPoint[] = [];
    let lastPatternId: string | null = null;
    
    for (const location of locations) {
      const matchingPattern = this.findNearbyPattern(location, patterns);
      const currentPatternId = matchingPattern?.id || null;
      
      if (currentPatternId !== lastPatternId) {
        route.push(location);
        lastPatternId = currentPatternId;
      }
    }
    
    return route.length >= 2 ? route : null;
  }

  private async analyzeAndSaveRoute(
    userId: string, 
    route: LocationPoint[], 
    profile: UserLocationProfile
  ): Promise<void> {
    if (route.length < 2) return;
    
    const startLocation = route[0];
    const endLocation = route[route.length - 1];
    
    // Check if similar route already exists
    const existingRoute = profile.routePatterns.find(r => {
      const startMatch = calculateDistance(
        startLocation.latitude, startLocation.longitude,
        route.find(p => p.id === r.startLocationId)?.latitude || 0,
        route.find(p => p.id === r.startLocationId)?.longitude || 0
      ) < 100;
      
      const endMatch = calculateDistance(
        endLocation.latitude, endLocation.longitude,
        route.find(p => p.id === r.endLocationId)?.latitude || 0,
        route.find(p => p.id === r.endLocationId)?.longitude || 0
      ) < 100;
      
      return startMatch && endMatch;
    });
    
    if (existingRoute) {
      existingRoute.frequency += 1;
      existingRoute.lastUsed = Date.now();
      existingRoute.confidence = Math.min(existingRoute.confidence + 0.02, 1.0);
    } else {
      // Create new route pattern
      const newRoute: RoutePattern = {
        id: generateId(),
        userId,
        startLocationId: startLocation.id,
        endLocationId: endLocation.id,
        waypoints: route.slice(1, -1), // Exclude start and end
        averageDuration: (endLocation.timestamp - startLocation.timestamp) / (1000 * 60), // minutes
        frequency: 1,
        timeWindows: this.analyzeTimeWindows(route),
        confidence: 0.3, // Initial confidence
        lastUsed: Date.now(),
        createdAt: Date.now()
      };
      
      await addRoutePattern(userId, newRoute);
      profile.routePatterns.push(newRoute);
    }
  }

  private async analyzeMovementAnomalies(
    userId: string, 
    currentLocation: LocationPoint, 
    recentLocations: LocationPoint[]
  ): Promise<void> {
    if (recentLocations.length < 2) return;

    const previousLocation = recentLocations[recentLocations.length - 2];
    const timeDiff = (currentLocation.timestamp - previousLocation.timestamp) / 1000; // seconds
    
    if (timeDiff > 0) {
      const distance = calculateDistance(
        previousLocation.latitude, 
        previousLocation.longitude,
        currentLocation.latitude, 
        currentLocation.longitude
      );
      
      const speedMps = distance / timeDiff; // meters per second
      const speedKph = speedMps * 3.6; // km/h

      // Detect impossible speeds (potential location spoofing)
      if (speedKph > 300) { // Faster than high-speed train
        console.warn(`Impossible speed detected for user ${userId}: ${speedKph.toFixed(1)} km/h`);
        await this.triggerImmediateAnomaly(userId, currentLocation, 'impossible_speed', speedKph);
      } else if (speedKph > 120 && this.isInResidentialArea(currentLocation, recentLocations)) {
        // High speed in residential area
        console.warn(`High speed in residential area for user ${userId}: ${speedKph.toFixed(1)} km/h`);
        await this.triggerImmediateAnomaly(userId, currentLocation, 'high_speed_residential', speedKph);
      }

      // Detect erratic movement patterns
      if (recentLocations.length >= 5) {
        const isErratic = this.detectErraticMovement(recentLocations);
        if (isErratic) {
          console.warn(`Erratic movement pattern detected for user ${userId}`);
          await this.triggerImmediateAnomaly(userId, currentLocation, 'erratic_movement', speedKph);
        }
      }
    }
  }

  private isInResidentialArea(location: LocationPoint, history: LocationPoint[]): boolean {
    // Simple heuristic: if recent locations show low speeds, likely residential
    const recentSpeeds = [];
    
    for (let i = 1; i < Math.min(history.length, 10); i++) {
      const timeDiff = (history[i].timestamp - history[i-1].timestamp) / 1000;
      if (timeDiff > 0) {
        const distance = calculateDistance(
          history[i-1].latitude, history[i-1].longitude,
          history[i].latitude, history[i].longitude
        );
        recentSpeeds.push((distance / timeDiff) * 3.6);
      }
    }

    const avgSpeed = recentSpeeds.length > 0 
      ? recentSpeeds.reduce((a, b) => a + b, 0) / recentSpeeds.length 
      : 0;
    
    return avgSpeed < 50; // Average speed under 50 km/h suggests residential area
  }

  private detectErraticMovement(locations: LocationPoint[]): boolean {
    if (locations.length < 5) return false;

    let directionChanges = 0;
    let previousBearing: number | null = null;

    for (let i = 1; i < locations.length; i++) {
      const bearing = this.calculateBearing(
        locations[i-1].latitude, locations[i-1].longitude,
        locations[i].latitude, locations[i].longitude
      );

      if (previousBearing !== null) {
        const bearingDiff = Math.abs(bearing - previousBearing);
        const normalizedDiff = Math.min(bearingDiff, 360 - bearingDiff);
        
        if (normalizedDiff > 90) { // Direction change > 90 degrees
          directionChanges++;
        }
      }
      
      previousBearing = bearing;
    }

    // Erratic if more than 50% of movements are significant direction changes
    return directionChanges / (locations.length - 2) > 0.5;
  }

  private calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }

  private async triggerImmediateAnomaly(
    userId: string, 
    location: LocationPoint, 
    anomalyType: string, 
    speed: number
  ): Promise<void> {
    try {
      const anomalyDetection = await import('@/lib/anomalyDetection');
      
      // Create a high-severity anomaly that bypasses normal thresholds
      const anomalyEvent = {
        id: generateId(),
        userId,
        timestamp: Date.now(),
        location,
        anomalyType: anomalyType as any,
        severity: 'high' as const,
        confidence: 0.9,
        description: `Movement anomaly detected: ${anomalyType} (${speed.toFixed(1)} km/h)`,
        challengeRequired: true,
        challengeIssued: false,
        challengeCompleted: false,
        challengeExpiry: Date.now() + (10 * 60 * 1000), // 10 minutes
        resolved: false
      };

      // Import and use challenge service directly for immediate response
      const challengeService = await import('@/lib/challengeService');
      await challengeService.issuePinChallenge(userId, anomalyEvent.id);
      
    } catch (error) {
      console.error('Failed to trigger immediate anomaly response:', error);
    }
  }
}

export const learningEngine = new LearningEngine();