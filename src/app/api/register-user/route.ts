import { NextResponse } from 'next/server';
import { createUserLocationProfile, saveLocationSettings } from '@/lib/locationDatabase';
import { generateId } from '@/lib/locationDatabase';

export async function POST(request: Request) {
  try {
    const { locationPermissionGranted } = await request.json();
    
    // Generate a unique user ID for this session/device
    const userId = generateId();
    
    if (locationPermissionGranted) {
      // Create location profile for the user
      await createUserLocationProfile(userId);
      
      // Set default location tracking settings
      await saveLocationSettings({
        userId,
        enabled: true,
        trackingInterval: 5, // 5 minutes
        highAccuracyMode: true,
        backgroundTracking: true,
        anomalyDetection: true,
        autoChallenge: true,
        challengeTimeout: 10, // 10 minutes
        learningMode: true,
        privacyMode: false
      });
      
      console.log(`User registered with location tracking: ${userId}`);
      
      return NextResponse.json({ 
        success: true, 
        userId,
        locationTrackingEnabled: true,
        learningMode: true,
        message: 'Registration successful. Location tracking enabled for 30-day learning period.'
      });
    } else {
      console.log(`User registered without location tracking: ${userId}`);
      
      return NextResponse.json({ 
        success: true, 
        userId,
        locationTrackingEnabled: false,
        message: 'Registration successful. Location tracking disabled - anomaly detection unavailable.'
      });
    }
    
  } catch (error) {
    console.error('Registration failed:', error);
    return NextResponse.json({ 
      error: 'Registration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}