export interface FailsafeConfig {
  documentPath: string;
  emailDistributionList: string[];
  encryptedPassword: string;
  lastSubmissionTime: number | null;
  nextDeadline: number;
}

export interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface FailsafeState {
  isLocked: boolean;
  nextDeadline: Date;
  lastSubmission: Date | null;
  failureTriggered: boolean;
}