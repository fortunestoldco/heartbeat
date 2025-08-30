'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  LinearProgress,
  Chip
} from '@mui/material';
import { Warning, Security, Timer } from '@mui/icons-material';
import { challengeService } from '@/lib/challengeService';

interface ActiveChallenge {
  id: string;
  userId: string;
  anomalyId: string;
  issuedAt: number;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  completed: boolean;
  failed: boolean;
}

interface PinChallengeDialogProps {
  userId: string;
  open: boolean;
  challenge: ActiveChallenge | null;
  onClose: () => void;
  onSuccess: () => void;
  onFailure: () => void;
}

export default function PinChallengeDialog({
  userId,
  open,
  challenge,
  onClose,
  onSuccess,
  onFailure
}: PinChallengeDialogProps) {
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (challenge && open) {
      const updateTimer = () => {
        const remaining = Math.max(0, challenge.expiresAt - Date.now());
        setTimeRemaining(remaining);
        
        if (remaining <= 0) {
          onFailure();
          onClose();
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      
      return () => clearInterval(interval);
    }
  }, [challenge, open, onFailure, onClose]);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!challenge || !pin.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await challengeService.submitPinAttempt(challenge.id, pin);
      
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'PIN verification failed');
        setPin('');
        
        if (result.error?.includes('Maximum attempts') || result.error?.includes('expired')) {
          onFailure();
          setTimeout(() => onClose(), 2000);
        }
      }
    } catch (error) {
      console.error('PIN submission error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!challenge) {
    return null;
  }

  const timePercentage = (timeRemaining / (10 * 60 * 1000)) * 100;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      disableEscapeKeyDown={true}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'error.dark',
          color: 'error.contrastText'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Warning color="error" fontSize="large" />
        <Box>
          <Typography variant="h5">Security Challenge</Typography>
          <Typography variant="subtitle2" color="error.light">
            Anomalous activity detected
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Unusual location or behavior pattern detected. Enter your security PIN to verify your identity.
          </Typography>
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Timer />
            <Typography variant="body2">
              Time remaining: {formatTime(timeRemaining)}
            </Typography>
            <Chip 
              label={`${challenge.maxAttempts - challenge.attempts} attempts left`}
              size="small"
              color={challenge.attempts >= 2 ? 'error' : 'warning'}
            />
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={timePercentage}
            color={timePercentage > 30 ? 'primary' : 'error'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            type="password"
            label="Security PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            disabled={isSubmitting}
            autoFocus
            autoComplete="off"
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': { color: 'inherit' },
              '& .MuiOutlinedInput-root': {
                color: 'inherit',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.5)'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.8)'
                }
              }
            }}
          />
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
        </form>

        <Typography variant="caption" display="block" sx={{ mt: 2, opacity: 0.7 }}>
          If you cannot verify your identity, emergency contacts will be notified and the system will enter lockdown mode.
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting || !pin.trim()}
          startIcon={<Security />}
          sx={{
            bgcolor: 'error.main',
            color: 'error.contrastText',
            '&:hover': {
              bgcolor: 'error.dark'
            }
          }}
        >
          {isSubmitting ? 'Verifying...' : 'Verify Identity'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}