import { generateId, updateAnomalyEvent } from '@/lib/locationDatabase';

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

class ChallengeService {
  private activeChallenges: Map<string, ActiveChallenge> = new Map();
  private challengeCallbacks: Map<string, (challenge: ActiveChallenge) => void> = new Map();

  async issuePinChallenge(userId: string, anomalyId: string): Promise<string> {
    const challengeId = generateId();
    const timeoutMinutes = 10;
    
    const challenge: ActiveChallenge = {
      id: challengeId,
      userId,
      anomalyId,
      issuedAt: Date.now(),
      expiresAt: Date.now() + (timeoutMinutes * 60 * 1000),
      attempts: 0,
      maxAttempts: 3,
      completed: false,
      failed: false
    };

    this.activeChallenges.set(challengeId, challenge);
    
    // Update the anomaly event
    await updateAnomalyEvent(anomalyId, {
      challengeIssued: true,
      challengeExpiry: challenge.expiresAt
    });

    // Set up timeout handler
    setTimeout(() => {
      this.handleChallengeTimeout(challengeId);
    }, timeoutMinutes * 60 * 1000);

    // Trigger UI notification if callback is registered
    const callback = this.challengeCallbacks.get(userId);
    if (callback) {
      callback(challenge);
    }

    console.log(`PIN challenge issued: ${challengeId} for user ${userId}, anomaly ${anomalyId}`);
    return challengeId;
  }

  async submitPinAttempt(challengeId: string, pin: string): Promise<{
    success: boolean;
    challenge?: ActiveChallenge;
    error?: string;
  }> {
    const challenge = this.activeChallenges.get(challengeId);
    
    if (!challenge) {
      return { success: false, error: 'Challenge not found or expired' };
    }

    if (challenge.completed || challenge.failed) {
      return { success: false, error: 'Challenge already completed or failed' };
    }

    if (Date.now() > challenge.expiresAt) {
      challenge.failed = true;
      await this.handleChallengeFailed(challenge);
      return { success: false, error: 'Challenge expired' };
    }

    challenge.attempts += 1;

    // Verify PIN against stored password hash
    const isValidPin = await this.verifyPin(pin, challenge.userId);
    
    if (isValidPin) {
      challenge.completed = true;
      await this.handleChallengeCompleted(challenge);
      this.activeChallenges.delete(challengeId);
      
      return { success: true, challenge };
    } else {
      if (challenge.attempts >= challenge.maxAttempts) {
        challenge.failed = true;
        await this.handleChallengeFailed(challenge);
        this.activeChallenges.delete(challengeId);
        
        return { success: false, error: 'Maximum attempts exceeded. Security alert triggered.' };
      }
      
      return { 
        success: false, 
        challenge,
        error: `Incorrect PIN. ${challenge.maxAttempts - challenge.attempts} attempts remaining.` 
      };
    }
  }

  private async verifyPin(pin: string, userId: string): Promise<boolean> {
    try {
      // Use the same password verification as the main system
      const response = await fetch('/api/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: pin }),
      });
      
      const result = await response.json();
      return result.valid === true;
    } catch (error) {
      console.error('PIN verification failed:', error);
      return false;
    }
  }

  private async handleChallengeCompleted(challenge: ActiveChallenge): Promise<void> {
    console.log(`Challenge completed successfully: ${challenge.id}`);
    
    // Update anomaly event
    await updateAnomalyEvent(challenge.anomalyId, {
      challengeCompleted: true,
      resolved: true,
      resolvedAt: Date.now()
    });

    // Log successful authentication
    this.logSecurityEvent(challenge.userId, 'challenge_completed', {
      challengeId: challenge.id,
      anomalyId: challenge.anomalyId,
      attempts: challenge.attempts
    });
  }

  private async handleChallengeFailed(challenge: ActiveChallenge): Promise<void> {
    console.log(`Challenge failed: ${challenge.id} for user ${challenge.userId}`);
    
    // Update anomaly event
    await updateAnomalyEvent(challenge.anomalyId, {
      challengeCompleted: false,
      resolved: false
    });

    // Trigger full security alert
    await this.triggerSecurityAlert(challenge);

    // Log security breach
    this.logSecurityEvent(challenge.userId, 'challenge_failed', {
      challengeId: challenge.id,
      anomalyId: challenge.anomalyId,
      attempts: challenge.attempts,
      reason: Date.now() > challenge.expiresAt ? 'timeout' : 'max_attempts'
    });
  }

  private async handleChallengeTimeout(challengeId: string): Promise<void> {
    const challenge = this.activeChallenges.get(challengeId);
    
    if (challenge && !challenge.completed && !challenge.failed) {
      challenge.failed = true;
      await this.handleChallengeFailed(challenge);
      this.activeChallenges.delete(challengeId);
    }
  }

  private async triggerSecurityAlert(challenge: ActiveChallenge): Promise<void> {
    try {
      // Send email alert
      await fetch('/api/send-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'challenge_failed',
          details: {
            challengeId: challenge.id,
            anomalyId: challenge.anomalyId,
            userId: challenge.userId,
            failureReason: Date.now() > challenge.expiresAt ? 'timeout' : 'incorrect_pin'
          }
        }),
      });

      // Send location alert if available
      await fetch('/api/location-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'challenge_failed',
          challengeId: challenge.id
        }),
      });

      console.log(`Security alerts triggered for failed challenge: ${challenge.id}`);
    } catch (error) {
      console.error('Failed to trigger security alerts:', error);
    }
  }

  private logSecurityEvent(userId: string, eventType: string, details: any): void {
    const logEntry = {
      timestamp: Date.now(),
      userId,
      eventType,
      details
    };
    
    console.log('Security Event:', JSON.stringify(logEntry));
    
    // In a production system, this would be stored in a secure audit log
    if (typeof window !== 'undefined') {
      const existingLogs = JSON.parse(localStorage.getItem('security-audit-log') || '[]');
      existingLogs.push(logEntry);
      
      // Keep only last 100 events
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
      }
      
      localStorage.setItem('security-audit-log', JSON.stringify(existingLogs));
    }
  }

  // Public methods for UI integration
  
  registerChallengeCallback(userId: string, callback: (challenge: ActiveChallenge) => void): void {
    this.challengeCallbacks.set(userId, callback);
  }

  unregisterChallengeCallback(userId: string): void {
    this.challengeCallbacks.delete(userId);
  }

  getActiveChallenge(userId: string): ActiveChallenge | null {
    for (const challenge of this.activeChallenges.values()) {
      if (challenge.userId === userId && !challenge.completed && !challenge.failed) {
        if (Date.now() <= challenge.expiresAt) {
          return challenge;
        }
      }
    }
    return null;
  }

  getChallengeStatus(challengeId: string): ActiveChallenge | null {
    return this.activeChallenges.get(challengeId) || null;
  }
}

export const challengeService = new ChallengeService();

// Convenience functions
export async function issuePinChallenge(userId: string, anomalyId: string): Promise<string> {
  return challengeService.issuePinChallenge(userId, anomalyId);
}

export async function submitPinAttempt(challengeId: string, pin: string) {
  return challengeService.submitPinAttempt(challengeId, pin);
}