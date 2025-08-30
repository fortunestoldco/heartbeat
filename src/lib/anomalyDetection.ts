import { 
  LocationPoint, 
  UserLocationProfile, 
  AnomalyEvent, 
  LocationPattern,
  RoutePattern 
} from '@/types/location';
import { 
  getUserLocationProfile, 
  saveAnomalyEvent, 
  getLocationSettings, 
  calculateDistance, 
  generateId 
} from '@/lib/locationDatabase';
import { learningEngine } from '@/lib/learningEngine';

interface AnomalyScore {
  score: number; // 0-1, higher = more anomalous
  factors: string[];
  severity: 'low' | 'medium' | 'high';
}

export class AnomalyDetectionService {
  
  async analyzeLocation(userId: string, location: LocationPoint): Promise<AnomalyEvent | null> {
    const profile = await getUserLocationProfile(userId);
    const settings = await getLocationSettings(userId);
    
    if (!profile || !settings.anomalyDetection) {
      return null;
    }

    // Continue learning if in learning mode
    if (profile.isLearningMode) {
      await learningEngine.processNewLocation(userId, location);
    }

    // Skip anomaly detection during learning mode
    if (profile.isLearningMode && profile.totalDataPoints < 100) {
      return null;
    }

    const anomalyScore = await this.calculateAnomalyScore(location, profile);
    
    if (anomalyScore.score > profile.anomalyThreshold) {
      const anomalyEvent = await this.createAnomalyEvent(
        userId, 
        location, 
        anomalyScore, 
        settings.autoChallenge
      );
      
      await saveAnomalyEvent(anomalyEvent);
      
      if (settings.autoChallenge && anomalyEvent.challengeRequired) {
        await this.triggerSecurityChallenge(userId, anomalyEvent);
      }
      
      return anomalyEvent;
    }
    
    return null;
  }

  private async calculateAnomalyScore(
    location: LocationPoint, 
    profile: UserLocationProfile
  ): Promise<AnomalyScore> {
    let totalScore = 0;
    const factors: string[] = [];
    
    // 1. Unknown location analysis
    const locationScore = this.analyzeLocationFamiliarity(location, profile.locationPatterns);
    totalScore += locationScore.score * 0.4;
    if (locationScore.score > 0.3) {
      factors.push(`Unknown location (${(locationScore.score * 100).toFixed(0)}% anomalous)`);
    }

    // 2. Time-based analysis
    const timeScore = this.analyzeTimeAnomalies(location, profile.locationPatterns);
    totalScore += timeScore.score * 0.25;
    if (timeScore.score > 0.3) {
      factors.push(`Unusual timing (${(timeScore.score * 100).toFixed(0)}% anomalous)`);
    }

    // 3. Movement pattern analysis
    const movementScore = await this.analyzeMovementPatterns(location, profile);
    totalScore += movementScore.score * 0.2;
    if (movementScore.score > 0.3) {
      factors.push(`Unusual movement pattern (${(movementScore.score * 100).toFixed(0)}% anomalous)`);
    }

    // 4. Speed and accuracy analysis
    const techScore = this.analyzeTechnicalAnomalies(location);
    totalScore += techScore.score * 0.15;
    if (techScore.score > 0.3) {
      factors.push(`Technical anomaly detected (${(techScore.score * 100).toFixed(0)}% suspicious)`);
    }

    // Determine severity
    let severity: 'low' | 'medium' | 'high';
    if (totalScore >= 0.8) severity = 'high';
    else if (totalScore >= 0.5) severity = 'medium';
    else severity = 'low';

    return {
      score: Math.min(totalScore, 1.0),
      factors,
      severity
    };
  }

  private analyzeLocationFamiliarity(
    location: LocationPoint, 
    patterns: LocationPattern[]
  ): { score: number } {
    if (patterns.length === 0) {
      return { score: 0.1 }; // Low score if no patterns learned yet
    }

    let minDistance = Infinity;
    let bestPatternConfidence = 0;
    
    for (const pattern of patterns) {
      const distance = calculateDistance(
        location.latitude, 
        location.longitude,
        pattern.centerLat, 
        pattern.centerLng
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        bestPatternConfidence = pattern.confidence;
      }
    }

    // Score based on distance from nearest known location
    let distanceScore = 0;
    if (minDistance > 5000) { // >5km from any known location
      distanceScore = 0.9;
    } else if (minDistance > 2000) { // >2km
      distanceScore = 0.6;
    } else if (minDistance > 500) { // >500m
      distanceScore = 0.3;
    } else if (minDistance > 100) { // >100m but within pattern radius
      distanceScore = 0.1;
    }

    // Reduce score based on confidence in nearest pattern
    const confidenceAdjustment = 1 - bestPatternConfidence;
    
    return { score: Math.min(distanceScore * confidenceAdjustment, 1.0) };
  }

  private analyzeTimeAnomalies(
    location: LocationPoint, 
    patterns: LocationPattern[]
  ): { score: number } {
    const locationDate = new Date(location.timestamp);
    const dayOfWeek = locationDate.getDay();
    const hour = locationDate.getHours();
    
    // Find patterns that match this location
    const nearbyPatterns = patterns.filter(pattern => {
      const distance = calculateDistance(
        location.latitude, location.longitude,
        pattern.centerLat, pattern.centerLng
      );
      return distance <= pattern.radiusMeters * 1.5; // Allow some flexibility
    });

    if (nearbyPatterns.length === 0) {
      return { score: 0.4 }; // Moderate score for unknown location at any time
    }

    // Check if current time matches any pattern's time windows
    const hasTimeMatch = nearbyPatterns.some(pattern => 
      pattern.timeWindows.some(window => 
        window.dayOfWeek === dayOfWeek &&
        hour >= window.startHour &&
        hour <= window.endHour
      )
    );

    if (hasTimeMatch) {
      return { score: 0.0 }; // Expected time
    }

    // Calculate how far off we are from expected times
    let minTimeDeviation = Infinity;
    
    for (const pattern of nearbyPatterns) {
      for (const window of pattern.timeWindows) {
        if (window.dayOfWeek === dayOfWeek) {
          const startDiff = Math.abs(hour - window.startHour);
          const endDiff = Math.abs(hour - window.endHour);
          const minDiff = Math.min(startDiff, endDiff);
          
          if (minDiff < minTimeDeviation) {
            minTimeDeviation = minDiff;
          }
        }
      }
    }

    // Score based on time deviation
    if (minTimeDeviation >= 6) return { score: 0.8 }; // 6+ hours off
    if (minTimeDeviation >= 3) return { score: 0.5 }; // 3+ hours off
    if (minTimeDeviation >= 1) return { score: 0.2 }; // 1+ hours off
    
    return { score: 0.1 };
  }

  private async analyzeMovementPatterns(
    location: LocationPoint, 
    profile: UserLocationProfile
  ): Promise<{ score: number }> {
    let totalScore = 0;
    
    // Check if location has impossible speed (potential spoofing)
    if (location.speed && location.speed > 200) { // >200 m/s = ~720 km/h
      totalScore += 0.9;
    } else if (location.speed && location.speed > 100) { // >100 m/s = ~360 km/h
      totalScore += 0.6;
    }
    
    // Check if location accuracy is suspiciously perfect (potential spoofing)
    if (location.accuracy < 3) { // <3m accuracy is very rare for mobile GPS
      totalScore += 0.3;
    }
    
    // Analyze recent movement history for patterns
    const recentMovementScore = await this.analyzeRecentMovement(location.id, profile);
    totalScore += recentMovementScore * 0.4;
    
    // Check route patterns
    const unusualRoute = this.checkRouteDeviations(location, profile.routePatterns);
    totalScore += unusualRoute * 0.3;
    
    // Check for rapid location changes (teleportation)
    const teleportationScore = await this.detectTeleportation(location.id, location);
    totalScore += teleportationScore * 0.5;
    
    return { score: Math.min(totalScore, 1.0) };
  }

  private checkRouteDeviations(location: LocationPoint, routes: RoutePattern[]): number {
    if (routes.length === 0) {
      return 0.1; // Low score if no routes learned
    }
    
    const currentHour = new Date(location.timestamp).getHours();
    const currentDay = new Date(location.timestamp).getDay();
    
    // Find routes that match current time context
    const relevantRoutes = routes.filter(route => 
      route.timeWindows.some(window => 
        window.dayOfWeek === currentDay &&
        currentHour >= window.startHour &&
        currentHour <= window.endHour
      )
    );
    
    if (relevantRoutes.length === 0) {
      return 0.3; // Moderate score - unexpected time for known routes
    }
    
    // Check if current location is near any waypoint of relevant routes
    let minDistance = Infinity;
    
    for (const route of relevantRoutes) {
      for (const waypoint of route.waypoints) {
        const distance = calculateDistance(
          location.latitude, location.longitude,
          waypoint.latitude, waypoint.longitude
        );
        minDistance = Math.min(minDistance, distance);
      }
    }
    
    // Score based on deviation from known routes
    if (minDistance > 2000) return 0.7; // >2km from any known route
    if (minDistance > 1000) return 0.4; // >1km from known routes
    if (minDistance > 500) return 0.2;  // >500m from known routes
    
    return 0.0; // On or near known route
  }

  private analyzeTechnicalAnomalies(location: LocationPoint): { score: number } {
    let score = 0;
    
    // Check for potential location spoofing indicators
    
    // 1. Perfect accuracy (rare in real-world scenarios)
    if (location.accuracy <= 1) {
      score += 0.3;
    }
    
    // 2. Very poor accuracy (could indicate jamming or spoofing)
    if (location.accuracy > 1000) {
      score += 0.4;
    }
    
    // 3. Suspicious source combination
    if (location.source === 'mixed' && location.accuracy < 5) {
      score += 0.2; // Mixed source with high accuracy is suspicious
    }
    
    // 4. Impossible coordinates
    if (Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) {
      score += 1.0;
    }
    
    return { score: Math.min(score, 1.0) };
  }

  private async analyzeRecentMovement(userId: string, profile: UserLocationProfile): Promise<number> {
    try {
      const recentHistory = await getLocationHistory(userId, 0.5); // Last 30 minutes
      
      if (recentHistory.length < 3) return 0.1;
      
      let anomalyScore = 0;
      let consecutiveHighSpeeds = 0;
      
      for (let i = 1; i < recentHistory.length; i++) {
        const timeDiff = (recentHistory[i].timestamp - recentHistory[i-1].timestamp) / 1000;
        
        if (timeDiff > 0) {
          const distance = calculateDistance(
            recentHistory[i-1].latitude, recentHistory[i-1].longitude,
            recentHistory[i].latitude, recentHistory[i].longitude
          );
          
          const speedKph = (distance / timeDiff) * 3.6;
          
          if (speedKph > 120) {
            consecutiveHighSpeeds++;
            anomalyScore += 0.2;
          } else {
            consecutiveHighSpeeds = 0;
          }
          
          // Penalty for sustained high speed
          if (consecutiveHighSpeeds > 3) {
            anomalyScore += 0.3;
          }
        }
      }
      
      return Math.min(anomalyScore, 0.9);
    } catch (error) {
      console.error('Error analyzing recent movement:', error);
      return 0.0;
    }
  }

  private async detectTeleportation(userId: string, currentLocation: LocationPoint): Promise<number> {
    try {
      const recentHistory = await getLocationHistory(userId, 0.1); // Last 6 minutes
      
      if (recentHistory.length === 0) return 0.0;
      
      const lastLocation = recentHistory[recentHistory.length - 1];
      const timeDiff = (currentLocation.timestamp - lastLocation.timestamp) / 1000; // seconds
      
      if (timeDiff < 60) { // Less than 1 minute gap
        const distance = calculateDistance(
          lastLocation.latitude, lastLocation.longitude,
          currentLocation.latitude, currentLocation.longitude
        );
        
        const maxPossibleDistance = (timeDiff / 3600) * 300 * 1000; // 300 km/h max
        
        if (distance > maxPossibleDistance && distance > 1000) { // >1km teleportation
          return 0.8; // High teleportation score
        }
      }
      
      return 0.0;
    } catch (error) {
      console.error('Error detecting teleportation:', error);
      return 0.0;
    }
  }

  private async createAnomalyEvent(
    userId: string, 
    location: LocationPoint, 
    anomalyScore: AnomalyScore,
    autoChallenge: boolean
  ): Promise<AnomalyEvent> {
    const anomalyType = this.determineAnomalyType(anomalyScore.factors);
    
    return {
      id: generateId(),
      userId,
      timestamp: Date.now(),
      location,
      anomalyType,
      severity: anomalyScore.severity,
      confidence: anomalyScore.score,
      description: this.generateAnomalyDescription(anomalyScore),
      challengeRequired: autoChallenge && anomalyScore.score > 0.6,
      challengeIssued: false,
      challengeCompleted: false,
      challengeExpiry: autoChallenge && anomalyScore.score > 0.6 
        ? Date.now() + (10 * 60 * 1000) // 10 minutes
        : undefined,
      resolved: false
    };
  }

  private determineAnomalyType(factors: string[]): AnomalyEvent['anomalyType'] {
    const factorText = factors.join(' ').toLowerCase();
    
    if (factorText.includes('technical') || factorText.includes('spoofing')) {
      return 'location_spoofing';
    }
    if (factorText.includes('speed') || factorText.includes('movement')) {
      return 'speed_anomaly';
    }
    if (factorText.includes('route') || factorText.includes('pattern')) {
      return 'unusual_route';
    }
    if (factorText.includes('timing') || factorText.includes('time')) {
      return 'unusual_time';
    }
    
    return 'unknown_location';
  }

  private generateAnomalyDescription(anomalyScore: AnomalyScore): string {
    const confidence = (anomalyScore.score * 100).toFixed(0);
    return `Anomalous activity detected (${confidence}% confidence): ${anomalyScore.factors.join(', ')}`;
  }

  private async triggerSecurityChallenge(userId: string, anomaly: AnomalyEvent): Promise<void> {
    try {
      // This would trigger the PIN challenge system
      const challengeService = await import('@/lib/challengeService');
      await challengeService.issuePinChallenge(userId, anomaly.id);
      
      console.log(`Security challenge triggered for user ${userId}, anomaly ${anomaly.id}`);
    } catch (error) {
      console.error('Failed to trigger security challenge:', error);
    }
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();

// Convenience function for external use
export async function analyzeLocation(userId: string, location: LocationPoint): Promise<AnomalyEvent | null> {
  return anomalyDetectionService.analyzeLocation(userId, location);
}