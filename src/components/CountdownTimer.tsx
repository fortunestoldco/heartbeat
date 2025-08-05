'use client';

import { useState, useEffect } from 'react';
import { calculateTimeRemaining } from '@/lib/timing';

interface CountdownTimerProps {
  deadline: Date;
  onDeadlineReached: () => void;
}

export default function CountdownTimer({ deadline, onDeadlineReached }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining(deadline));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(deadline);
      setTimeRemaining(remaining);
      
      if (remaining.days === 0 && remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0) {
        onDeadlineReached();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, onDeadlineReached]);

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
        Time Until Next Check-in
      </h2>
      <div className="grid grid-cols-4 gap-4 text-center">
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-3xl font-bold text-red-600">
            {formatTime(timeRemaining.days)}
          </div>
          <div className="text-sm text-gray-600">Days</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-3xl font-bold text-red-600">
            {formatTime(timeRemaining.hours)}
          </div>
          <div className="text-sm text-gray-600">Hours</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-3xl font-bold text-red-600">
            {formatTime(timeRemaining.minutes)}
          </div>
          <div className="text-sm text-gray-600">Minutes</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-3xl font-bold text-red-600">
            {formatTime(timeRemaining.seconds)}
          </div>
          <div className="text-sm text-gray-600">Seconds</div>
        </div>
      </div>
    </div>
  );
}