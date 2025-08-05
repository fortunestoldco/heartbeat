import { NextResponse } from 'next/server';

const GOOGLE_GEOLOCATION_API_KEY = process.env.GOOGLE_GEOLOCATION_API_KEY;

export async function POST(request: Request) {
  try {
    if (!GOOGLE_GEOLOCATION_API_KEY) {
      return NextResponse.json({ error: 'Google Geolocation API not configured' }, { status: 500 });
    }

    const { wifiNetworks } = await request.json();
    
    if (!wifiNetworks || !Array.isArray(wifiNetworks) || wifiNetworks.length === 0) {
      return NextResponse.json({ error: 'WiFi networks required for location' }, { status: 400 });
    }

    const requestBody = {
      considerIp: false,
      wifiAccessPoints: wifiNetworks.map((network: any) => ({
        macAddress: network.macAddress,
        signalStrength: network.signalStrength,
        channel: network.channel,
      })).filter((ap: any) => ap.macAddress),
    };

    if (requestBody.wifiAccessPoints.length === 0) {
      return NextResponse.json({ error: 'No valid WiFi networks provided' }, { status: 400 });
    }

    const response = await fetch(
      `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_GEOLOCATION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();
    
    if (!response.ok || data.error) {
      console.error('Google Geolocation API error:', data.error);
      return NextResponse.json({ 
        error: 'Location service unavailable',
        details: data.error?.message || 'Unknown error'
      }, { status: 500 });
    }

    return NextResponse.json({
      location: {
        latitude: data.location.lat,
        longitude: data.location.lng,
        accuracy: data.accuracy,
        source: 'wifi',
      }
    });

  } catch (error) {
    console.error('Location API error:', error);
    return NextResponse.json({ 
      error: 'Failed to get location',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}