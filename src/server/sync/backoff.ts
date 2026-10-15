const BASE_MS = 1_000;
const CAP_MS = 5 * 60 * 1_000;

/** Exponential backoff with full jitter in the upper half of the window. */
export function nextDelayMs(attempt: number, random: number = Math.random()): number {
  const safeAttempt = Math.max(0, attempt);
  const exponential = Math.min(CAP_MS, BASE_MS * 2 ** safeAttempt);
  const unit = Math.min(1, Math.max(0, random));
  const jitter = 0.5 + unit * 0.5;
  return Math.round(exponential * jitter);
}
