import { LocationPoint } from '@/types/location';
import { generateId, saveLocationPoint, getLocationSettings } from '@/lib/locationDatabase';
import { getCurrentLocation } from '@/lib/location';

interface LocationTracker {
  userId: string;
  isTracking: boolean;
  intervalId?: NodeJS.Timeout;
  lastKnownLocation?: LocationPoint;
  trackingStartTime?: number;
}

class LocationTrackingService {
  private trackers: Map<string, LocationTracker> = new Map();

  async startTracking(userId: string): Promise<void> {
    if (this.trackers.has(userId)) {
      console.log(`Location tracking already active for user ${userId}`);
      return;
    }

    const settings = await getLocationSettings(userId);
    
    if (!settings.enabled) {
      console.log(`Location tracking disabled for user ${userId}`);
      return;
    }

    const tracker: LocationTracker = {
      userId,
      isTracking: true,
      trackingStartTime: Date.now()
    };

    // Start periodic location updates
    tracker.intervalId = setInterval(async () => {
      try {
        await this.captureLocation(userId, settings.highAccuracyMode);
      } catch (error) {
        console.error(`Location capture failed for user ${userId}:`, error);
      }
    }, settings.trackingInterval * 60 * 1000); // Convert minutes to milliseconds

    this.trackers.set(userId, tracker);
    
    // Capture initial location
    try {
      await this.captureLocation(userId, settings.highAccuracyMode);
      console.log(`Location tracking started for user ${userId}`);
    } catch (error) {
      console.error(`Initial location capture failed for user ${userId}:`, error);
    }
  }

  async stopTracking(userId: string): Promise<void> {
    const tracker = this.trackers.get(userId);
    
    if (tracker) {
      tracker.isTracking = false;
      if (tracker.intervalId) {
        clearInterval(tracker.intervalId);
      }
      this.trackers.delete(userId);
      console.log(`Location tracking stopped for user ${userId}`);
    }
  }

  private async captureLocation(userId: string, highAccuracy: boolean = true): Promise<void> {
    try {
      const locationData = await getCurrentLocation();
      
      const locationPoint: LocationPoint = {
        id: generateId(),
        timestamp: Date.now(),
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        source: locationData.source
      };

      // Add speed and heading if available from geolocation
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (position.coords.speed !== null) {
              locationPoint.speed = position.coords.speed;
            }
            if (position.coords.heading !== null) {
              locationPoint.heading = position.coords.heading;
            }
          },
          () => {}, // Ignore errors for this additional data
          { enableHighAccuracy: highAccuracy, timeout: 5000, maximumAge: 60000 }
        );
      }

      await saveLocationPoint(locationPoint);
      
      // Update tracker's last known location
      const tracker = this.trackers.get(userId);
      if (tracker) {
        tracker.lastKnownLocation = locationPoint;
      }

      // Trigger anomaly detection
      await this.checkForAnomalies(userId, locationPoint);
      
    } catch (error) {
      console.error(`Location capture failed for user ${userId}:`, error);
    }
  }

  private async checkForAnomalies(userId: string, currentLocation: LocationPoint): Promise<void> {
    try {
      const anomalyService = await import('@/lib/anomalyDetection');
      await anomalyService.analyzeLocation(userId, currentLocation);
    } catch (error) {
      console.error('Anomaly detection failed:', error);
    }
  }

  async getCurrentLocation(userId: string): Promise<LocationPoint | null> {
    const tracker = this.trackers.get(userId);
    return tracker?.lastKnownLocation || null;
  }

  isTracking(userId: string): boolean {
    return this.trackers.has(userId) && this.trackers.get(userId)!.isTracking;
  }

  async getTrackingStatus(userId: string): Promise<{
    isTracking: boolean;
    lastLocation?: LocationPoint;
    trackingDuration?: number;
  }> {
    const tracker = this.trackers.get(userId);
    
    if (!tracker) {
      return { isTracking: false };
    }

    const duration = tracker.trackingStartTime 
      ? Date.now() - tracker.trackingStartTime 
      : undefined;

    return {
      isTracking: tracker.isTracking,
      lastLocation: tracker.lastKnownLocation,
      trackingDuration: duration
    };
  }
}

// Singleton instance
export const locationTrackingService = new LocationTrackingService();

// Browser-side utilities for managing location tracking
export function startBrowserLocationTracking(userId: string): void {
  if (typeof window !== 'undefined') {
    // Store tracking state in localStorage
    localStorage.setItem('failsafe-location-tracking', 'true');
    localStorage.setItem('failsafe-tracking-user', userId);
    
    // Start the tracking service
    locationTrackingService.startTracking(userId);
  }
}

export function stopBrowserLocationTracking(userId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('failsafe-location-tracking');
    localStorage.removeItem('failsafe-tracking-user');
    
    locationTrackingService.stopTracking(userId);
  }
}

// Auto-resume tracking on page load
if (typeof window !== 'undefined') {
  const isTracking = localStorage.getItem('failsafe-location-tracking') === 'true';
  const userId = localStorage.getItem('failsafe-tracking-user');
  
  if (isTracking && userId) {
    // Resume tracking after a short delay to allow the app to initialize
    setTimeout(() => {
      locationTrackingService.startTracking(userId);
    }, 2000);
  }
}