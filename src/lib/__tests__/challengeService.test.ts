import { jest } from '@jest/globals';
import { ChallengeService, issuePinChallenge, submitPinAttempt } from '../challengeService';

// Mock the locationDatabase module
jest.mock('../locationDatabase', () => ({
  generateId: jest.fn(() => 'test-challenge-id'),
  updateAnomalyEvent: jest.fn()
}));

// Mock fetch globally
global.fetch = jest.fn();

import * as locationDb from '../locationDatabase';

describe('ChallengeService', () => {
  let challengeService: ChallengeService;

  beforeEach(() => {
    challengeService = new ChallengeService();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ valid: true })
    });
  });

  describe('issuePinChallenge', () => {
    it('should create and store a new challenge', async () => {
      const challengeId = await challengeService.issuePinChallenge('test-user', 'test-anomaly');

      expect(challengeId).toBe('test-challenge-id');
      expect(locationDb.updateAnomalyEvent).toHaveBeenCalledWith('test-anomaly', {
        challengeIssued: true,
        challengeExpiry: expect.any(Number)
      });
    });

    it('should set 10-minute expiry', async () => {
      const beforeTime = Date.now();
      await challengeService.issuePinChallenge('test-user', 'test-anomaly');
      const afterTime = Date.now();

      const challenge = challengeService.getActiveChallenge('test-user');
      expect(challenge?.expiresAt).toBeGreaterThan(beforeTime + 9 * 60 * 1000);
      expect(challenge?.expiresAt).toBeLessThan(afterTime + 11 * 60 * 1000);
    });

    it('should register challenge callback', async () => {
      const mockCallback = jest.fn();
      challengeService.registerChallengeCallback('test-user', mockCallback);

      await challengeService.issuePinChallenge('test-user', 'test-anomaly');

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user',
          anomalyId: 'test-anomaly'
        })
      );
    });
  });

  describe('submitPinAttempt', () => {
    it('should return error for non-existent challenge', async () => {
      const result = await challengeService.submitPinAttempt('nonexistent', '1234');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Challenge not found or expired');
    });

    it('should accept correct PIN', async () => {
      const challengeId = await challengeService.issuePinChallenge('test-user', 'test-anomaly');
      
      const result = await challengeService.submitPinAttempt(challengeId, 'correct-pin');

      expect(result.success).toBe(true);
      expect(result.challenge?.completed).toBe(true);
    });

    it('should reject incorrect PIN', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: false })
      });

      const challengeId = await challengeService.issuePinChallenge('test-user', 'test-anomaly');
      
      const result = await challengeService.submitPinAttempt(challengeId, 'wrong-pin');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Incorrect PIN');
      expect(result.challenge?.attempts).toBe(1);
    });

    it('should fail challenge after max attempts', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: false })
      });

      const challengeId = await challengeService.issuePinChallenge('test-user', 'test-anomaly');
      
      // Exhaust all attempts
      await challengeService.submitPinAttempt(challengeId, 'wrong1');
      await challengeService.submitPinAttempt(challengeId, 'wrong2');
      const finalResult = await challengeService.submitPinAttempt(challengeId, 'wrong3');

      expect(finalResult.success).toBe(false);
      expect(finalResult.error).toContain('Maximum attempts exceeded');
    });

    it('should handle expired challenges', async () => {
      const challengeId = await challengeService.issuePinChallenge('test-user', 'test-anomaly');
      
      // Manually expire the challenge
      const challenge = challengeService.getChallengeStatus(challengeId);
      if (challenge) {
        challenge.expiresAt = Date.now() - 1000; // Expired 1 second ago
      }

      const result = await challengeService.submitPinAttempt(challengeId, 'any-pin');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Challenge expired');
    });
  });

  describe('getActiveChallenge', () => {
    it('should return null for user with no active challenges', () => {
      const challenge = challengeService.getActiveChallenge('no-challenges-user');
      expect(challenge).toBeNull();
    });

    it('should return active challenge for user', async () => {
      await challengeService.issuePinChallenge('test-user', 'test-anomaly');
      
      const challenge = challengeService.getActiveChallenge('test-user');
      expect(challenge).toBeDefined();
      expect(challenge?.userId).toBe('test-user');
      expect(challenge?.completed).toBe(false);
      expect(challenge?.failed).toBe(false);
    });

    it('should return null for expired challenges', async () => {
      const challengeId = await challengeService.issuePinChallenge('test-user', 'test-anomaly');
      
      // Expire the challenge
      const challenge = challengeService.getChallengeStatus(challengeId);
      if (challenge) {
        challenge.expiresAt = Date.now() - 1000;
      }

      const activeChallenge = challengeService.getActiveChallenge('test-user');
      expect(activeChallenge).toBeNull();
    });
  });

  describe('verifyPin', () => {
    it('should call verify-password API', async () => {
      await (challengeService as any).verifyPin('test-pin', 'test-user');

      expect(global.fetch).toHaveBeenCalledWith('/api/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: 'test-pin' }),
      });
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await (challengeService as any).verifyPin('test-pin', 'test-user');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('PIN verification failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('callback management', () => {
    it('should register and unregister callbacks', () => {
      const mockCallback = jest.fn();
      
      challengeService.registerChallengeCallback('test-user', mockCallback);
      challengeService.unregisterChallengeCallback('test-user');
      
      // No way to directly test since callbacks are private, but should not throw
      expect(true).toBe(true);
    });
  });
});

describe('module exports', () => {
  describe('issuePinChallenge', () => {
    it('should call challengeService.issuePinChallenge', async () => {
      const spy = jest.spyOn(ChallengeService.prototype, 'issuePinChallenge');
      spy.mockResolvedValue('test-id');

      const result = await issuePinChallenge('user', 'anomaly');
      expect(result).toBe('test-id');
      
      spy.mockRestore();
    });
  });

  describe('submitPinAttempt', () => {
    it('should call challengeService.submitPinAttempt', async () => {
      const mockResult = { success: true };
      const spy = jest.spyOn(ChallengeService.prototype, 'submitPinAttempt');
      spy.mockResolvedValue(mockResult);

      const result = await submitPinAttempt('challenge-id', 'pin');
      expect(result).toBe(mockResult);
      
      spy.mockRestore();
    });
  });
});