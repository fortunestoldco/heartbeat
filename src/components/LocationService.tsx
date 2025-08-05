'use client';

import { useEffect, useState } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  source: string;
}

interface LocationServiceProps {
  onLocationObtained: (location: LocationData) => void;
  onError: (error: string) => void;
  trigger: boolean;
}

export default function LocationService({ onLocationObtained, onError, trigger }: LocationServiceProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    if (!trigger || isGettingLocation) return;

    const getLocation = async () => {
      setIsGettingLocation(true);
      
      try {
        if (!navigator.geolocation) {
          throw new Error('Geolocation not supported by this browser');
        }

        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            }
          );
        });

        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'gps-fallback',
        };

        onLocationObtained(locationData);

      } catch (error) {
        console.error('Failed to get location:', error);
        onError(error instanceof Error ? error.message : 'Location unavailable');
      } finally {
        setIsGettingLocation(false);
      }
    };

    getLocation();
  }, [trigger, isGettingLocation, onLocationObtained, onError]);

  return null;
}