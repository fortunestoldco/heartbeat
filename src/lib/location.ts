export interface WiFiNetwork {
  macAddress: string;
  signalStrength: number;
  channel?: number;
  ssid?: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  source: 'wifi' | 'cell' | 'mixed' | 'gps';
}

export async function getWiFiNetworks(): Promise<WiFiNetwork[]> {
  try {
    if (!navigator.permissions) {
      throw new Error('Permissions API not supported');
    }

    const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    if (permission.state === 'denied') {
      throw new Error('Geolocation permission denied');
    }

    const networks: WiFiNetwork[] = [];

    if ('wifi' in navigator) {
      const wifiNetworks = await (navigator as any).wifi.getNetworks();
      networks.push(...wifiNetworks.map((network: any) => ({
        macAddress: network.bssid || network.macAddress,
        signalStrength: network.signalStrength || network.rssi,
        channel: network.channel,
        ssid: network.ssid,
      })));
    }

    if (networks.length === 0) {
      throw new Error('No WiFi networks detected. Location service unavailable.');
    }

    return networks;
  } catch (error) {
    console.error('Failed to get WiFi networks:', error);
    throw error;
  }
}

export async function getLocationFromWiFi(networks: WiFiNetwork[]): Promise<LocationData> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Maps API key not configured');
  }

  try {
    const requestBody = {
      considerIp: false,
      wifiAccessPoints: networks.map(network => ({
        macAddress: network.macAddress,
        signalStrength: network.signalStrength,
        channel: network.channel,
      })),
    };

    const response = await fetch(
      `https://www.googleapis.com/geolocation/v1/geolocate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(`Geolocation API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Geolocation API error: ${data.error.message}`);
    }

    return {
      latitude: data.location.lat,
      longitude: data.location.lng,
      accuracy: data.accuracy,
      source: 'wifi',
    };
  } catch (error) {
    console.error('Failed to get location from WiFi:', error);
    throw error;
  }
}

export async function getCurrentLocation(): Promise<LocationData> {
  try {
    const networks = await getWiFiNetworks();
    return await getLocationFromWiFi(networks);
  } catch (wifiError) {
    console.warn('WiFi-based location failed, attempting fallback:', wifiError);
    
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: 'gps',
          });
        },
        (error) => {
          reject(new Error(`Location unavailable: ${error.message}`));
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });
  }
}

export function formatLocationForSpeech(location: LocationData): string {
  const latDeg = Math.floor(Math.abs(location.latitude));
  const latMin = ((Math.abs(location.latitude) - latDeg) * 60).toFixed(4);
  const latDir = location.latitude >= 0 ? 'North' : 'South';
  
  const lngDeg = Math.floor(Math.abs(location.longitude));
  const lngMin = ((Math.abs(location.longitude) - lngDeg) * 60).toFixed(4);
  const lngDir = location.longitude >= 0 ? 'East' : 'West';
  
  return `${latDeg} degrees ${latMin} minutes ${latDir}, ${lngDeg} degrees ${lngMin} minutes ${lngDir}`;
}