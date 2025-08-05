import { FailsafeState } from '@/types';

const STORAGE_KEY = 'failsafe-state';

export function saveFailsafeState(state: FailsafeState): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state,
      nextDeadline: state.nextDeadline.toISOString(),
      lastSubmission: state.lastSubmission?.toISOString() || null,
    }));
  }
}

export function loadFailsafeState(): FailsafeState | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          nextDeadline: new Date(parsed.nextDeadline),
          lastSubmission: parsed.lastSubmission ? new Date(parsed.lastSubmission) : null,
        };
      } catch (error) {
        console.error('Failed to parse stored state:', error);
        return null;
      }
    }
  }
  return null;
}