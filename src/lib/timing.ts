export function getNextDeadline(): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const midnight = new Date(today);
  midnight.setHours(0, 0, 0, 0);
  
  const noon = new Date(today);
  noon.setHours(12, 0, 0, 0);
  
  if (now < midnight) {
    return midnight;
  } else if (now < noon) {
    return noon;
  } else {
    const nextMidnight = new Date(today);
    nextMidnight.setDate(today.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    return nextMidnight;
  }
}

export function calculateTimeRemaining(deadline: Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = new Date().getTime();
  const deadlineTime = deadline.getTime();
  const timeDiff = deadlineTime - now;
  
  if (timeDiff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds };
}

export function hasDeadlinePassed(deadline: Date): boolean {
  return new Date() > deadline;
}