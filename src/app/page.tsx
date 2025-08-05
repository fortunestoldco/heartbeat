'use client';

import { useState, useEffect, useCallback } from 'react';
import CountdownTimer from '@/components/CountdownTimer';
import PasswordForm from '@/components/PasswordForm';
import LocationService from '@/components/LocationService';
import { getNextDeadline, hasDeadlinePassed } from '@/lib/timing';
import { loadFailsafeState, saveFailsafeState } from '@/lib/storage';
import { FailsafeState } from '@/types';

export default function HomePage() {
  const [state, setState] = useState<FailsafeState>({
    isLocked: false,
    nextDeadline: getNextDeadline(),
    lastSubmission: null,
    failureTriggered: false,
  });
  
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldGetLocation, setShouldGetLocation] = useState(false);

  useEffect(() => {
    const savedState = loadFailsafeState();
    if (savedState) {
      if (hasDeadlinePassed(savedState.nextDeadline) && !savedState.failureTriggered) {
        // We'll call triggerFailsafe after it's defined
        setTimeout(() => triggerFailsafe('deadline'), 0);
      } else {
        setState(savedState);
      }
    }
    setIsInitialized(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isInitialized) {
      saveFailsafeState(state);
    }
  }, [state, isInitialized]);

  const triggerFailsafe = useCallback(async (reason: 'deadline' | 'wrong-password', location?: any) => {
    try {
      const promises = [
        fetch('/api/send-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        })
      ];

      if (location && process.env.NODE_ENV !== 'development') {
        promises.push(
          fetch('/api/location-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason, location }),
          })
        );
      }

      const responses = await Promise.allSettled(promises);
      const emailResponse = responses[0];

      if (emailResponse.status === 'fulfilled' && emailResponse.value.ok) {
        setState(prev => ({ ...prev, failureTriggered: true, isLocked: true }));
        setAlertMessage({
          type: 'success',
          text: 'thankyou :)'
        });
      } else {
        console.error('Failed to send alert');
        setAlertMessage({
          type: 'error',
          text: 'System error: Failed to send emergency alert. Please check configuration.'
        });
      }
    } catch (error) {
      console.error('Error triggering failsafe:', error);
      setAlertMessage({
        type: 'error',
        text: 'Critical error: Unable to communicate with security system.'
      });
    }
  }, []);

  const handleDeadlineReached = useCallback(() => {
    if (!state.failureTriggered) {
      triggerFailsafe('deadline');
    }
  }, [state.failureTriggered, triggerFailsafe]);

  const handlePasswordSubmit = async (password: string) => {
    try {
      const response = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (result.valid) {
        const newDeadline = getNextDeadline();
        setState(prev => ({
          ...prev,
          lastSubmission: new Date(),
          nextDeadline: newDeadline,
          failureTriggered: false,
          isLocked: false,
        }));
        setAlertMessage({
          type: 'success',
          text: 'thankyou :)'
        });
      } else {
        setShouldGetLocation(true);
      }
    } catch (error) {
      console.error('Password verification error:', error);
      setAlertMessage({
        type: 'error',
        text: 'System error: Unable to verify password. Check network connection.'
      });
    }
  };

  const handleLocationObtained = useCallback((location: any) => {
    setShouldGetLocation(false);
    triggerFailsafe('wrong-password', location);
  }, [triggerFailsafe]);

  const handleLocationError = useCallback((error: string) => {
    setShouldGetLocation(false);
    console.warn('Location unavailable:', error);
    triggerFailsafe('wrong-password');
  }, [triggerFailsafe]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            failsafe
          </h1>
          <p className="text-lg text-gray-700 leading-relaxed">
            This is a security system that requires regular check-ins. You must enter your password 
            twice daily at 12:00 AM and 12:00 PM. Missing a deadline or entering an incorrect 
            password will trigger automated document distribution.
          </p>
          {state.lastSubmission && (
            <p className="text-sm text-gray-600 mt-4">
              Last successful check-in: {state.lastSubmission.toLocaleString()}
            </p>
          )}
        </div>

        {alertMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            alertMessage.type === 'success' 
              ? 'bg-green-50 border-l-4 border-green-400 text-green-700' 
              : 'bg-red-50 border-l-4 border-red-400 text-red-700'
          }`}>
            <p className="font-medium">{alertMessage.text}</p>
          </div>
        )}

        {state.failureTriggered ? (
          <div className="bg-red-100 border-2 border-red-500 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-red-800 mb-4">🚨 SYSTEM LOCKED 🚨</h2>
            <p className="text-red-700">
              The failsafe has been triggered. Automated document distribution is now active.
              This system is permanently locked for security reasons.
            </p>
          </div>
        ) : (
          <>
            <CountdownTimer 
              deadline={state.nextDeadline} 
              onDeadlineReached={handleDeadlineReached}
            />
            
            <PasswordForm 
              onSubmit={handlePasswordSubmit}
              disabled={state.isLocked}
            />
          </>
        )}

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>⚠️ WARNING: This system is designed for security purposes.</p>
          <p>Tampering with or disabling this system may trigger automated document distribution.</p>
        </div>

        <LocationService 
          trigger={shouldGetLocation}
          onLocationObtained={handleLocationObtained}
          onError={handleLocationError}
        />
      </div>
    </div>
  );
}