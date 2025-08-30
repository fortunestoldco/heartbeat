'use client';

import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  Button, 
  Box, 
  Alert,
  FormControlLabel,
  Checkbox,
  CircularProgress
} from '@mui/material';

interface RegistrationProps {
  onRegistrationComplete: (userId: string, locationEnabled: boolean) => void;
}

export default function UserRegistration({ onRegistrationComplete }: RegistrationProps) {
  const [locationPermission, setLocationPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreeToTracking, setAgreeToTracking] = useState(false);

  useEffect(() => {
    // Check current location permission status
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          setLocationPermission('granted');
          setAgreeToTracking(true);
        } else if (result.state === 'denied') {
          setLocationPermission('denied');
        }
      });
    }
  }, []);

  const requestLocationPermission = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationPermission('denied');
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationPermission('granted');
          resolve(true);
        },
        (error) => {
          console.error('Location permission denied:', error);
          setLocationPermission('denied');
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleRegistration = async () => {
    setIsRegistering(true);
    setError(null);

    try {
      let locationGranted = false;

      if (agreeToTracking && locationPermission !== 'denied') {
        locationGranted = await requestLocationPermission();
      }

      const response = await fetch('/api/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationPermissionGranted: locationGranted,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store user ID in localStorage
        localStorage.setItem('failsafe-user-id', data.userId);
        localStorage.setItem('failsafe-location-enabled', locationGranted.toString());
        
        onRegistrationComplete(data.userId, locationGranted);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error during registration');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Failsafe Security Setup
      </Typography>
      
      <Typography variant="body1" paragraph>
        Welcome to the Failsafe Security System. This application monitors your check-ins and can 
        optionally track your location patterns for enhanced security.
      </Typography>

      <Box sx={{ my: 3 }}>
        <Typography variant="h6" gutterBottom>
          Location-Based Anomaly Detection (Optional)
        </Typography>
        
        <Typography variant="body2" paragraph color="text.secondary">
          Enable location tracking to activate intelligent anomaly detection. The system will:
        </Typography>
        
        <ul style={{ marginLeft: '20px', color: '#666' }}>
          <li>Learn your normal movement patterns over 30 days</li>
          <li>Detect unusual locations or routes</li>
          <li>Require PIN entry when anomalies are detected</li>
          <li>Enhance security without compromising privacy</li>
        </ul>

        <FormControlLabel
          control={
            <Checkbox
              checked={agreeToTracking}
              onChange={(e) => setAgreeToTracking(e.target.checked)}
              disabled={locationPermission === 'denied'}
            />
          }
          label="Enable location-based anomaly detection"
          sx={{ mt: 2 }}
        />

        {locationPermission === 'denied' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Location access has been denied. You can still use the basic failsafe system, 
            but anomaly detection will not be available.
          </Alert>
        )}

        {locationPermission === 'granted' && agreeToTracking && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Location access granted. Anomaly detection will be enabled with a 30-day learning period.
          </Alert>
        )}
      </Box>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleRegistration}
          disabled={isRegistering}
          sx={{ minWidth: 200 }}
        >
          {isRegistering ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Setting up...
            </>
          ) : (
            'Complete Setup'
          )}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="caption" display="block" sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
        Your privacy is protected. Location data is stored locally and used only for security purposes.
      </Typography>
    </Paper>
  );
}