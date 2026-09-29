/**
 * PLANTED BUG EXERCISE
 *
 * This is a version of checkRateLimit with ONE deliberate bug planted.
 * Your task: write pseudocode for what this function ACTUALLY does,
 * then write pseudocode for what it SHOULD do.
 * The bug is the difference.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimitBuggy(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  // BUG IS ON THE NEXT LINE
  if (existing.count > limit) {       // <-- should be >= limit, not > limit
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
