# Planted Bug Exercise - checkRateLimitBuggy

The exercise is to write pseudocode for what the function *actually* does, then for what
it *should* do. The two versions came out identical except for one comparison operator
in step 4, so they are shown side by side rather than as two near-duplicate blocks.

---

## The one line that differs

```ts
// actual
if (existing.count > limit) {

// should be
if (existing.count >= limit) {
```

Everything else - the reset handling in step 3, the increment in step 5, the return
shapes - is the same in both versions.

---

## Step 1: Pseudocode for what the buggy function ACTUALLY does

```
FUNCTION checkRateLimitBuggy
INPUTS:
  key (string)      - a unique identifier for this rate-limit bucket (e.g. "signin:10.0.0.1")
  limit (number)    - the maximum number of allowed attempts
  windowMs (number) - the duration of the rate-limit window in milliseconds
OUTPUT:
  { allowed: boolean, retryAfterSeconds: number }
SIDE EFFECTS:
  - READS and WRITES to the in-memory buckets map

1. Record the current timestamp as now.

2. Look up the existing bucket for this key.

3. IF no bucket exists OR the existing bucket's reset time has already passed
     Create a new bucket with count = 1 and resetAt = now + windowMs.
     RETURN { allowed: true, retryAfterSeconds: 0 }
   END IF

4. IF the existing bucket's count is STRICTLY GREATER THAN the limit
     (i.e. count > limit)
     Calculate seconds until the window resets.
     RETURN { allowed: false, retryAfterSeconds: seconds }
   END IF

5. Increment the existing bucket's count by 1.

6. RETURN { allowed: true, retryAfterSeconds: 0 }
```

---

## Step 2: Pseudocode for what the function SHOULD do

```
FUNCTION checkRateLimit (correct version)
INPUTS:
  key (string)
  limit (number)
  windowMs (number)
OUTPUT:
  { allowed: boolean, retryAfterSeconds: number }
SIDE EFFECTS:
  - READS and WRITES to the in-memory buckets map

1. Record the current timestamp as now.

2. Look up the existing bucket for this key.

3. IF no bucket exists OR the existing bucket's reset time has already passed
     Create a new bucket with count = 1 and resetAt = now + windowMs.
     RETURN { allowed: true, retryAfterSeconds: 0 }
   END IF

4. IF the existing bucket's count is GREATER THAN OR EQUAL TO the limit
     (i.e. count >= limit)
     Calculate seconds until the window resets.
     RETURN { allowed: false, retryAfterSeconds: seconds }
   END IF

5. Increment the existing bucket's count by 1.

6. RETURN { allowed: true, retryAfterSeconds: 0 }
```

---

## The Bug

| | Buggy | Correct |
|---|---|---|
| **Line** | `if (existing.count > limit)` | `if (existing.count >= limit)` |
| **Operator** | `>` (strictly greater than) | `>=` (greater than or equal) |

### What the bug causes

With `limit = 5` and `> limit`, the function blocks only when count is **6 or more**.
This means **the 6th attempt succeeds** when it should be blocked. A caller gets **one
extra free attempt** beyond the stated limit on every window.

**Concrete example:**
- Limit = 5, attacker tries 6 times in the window
- Buggy version: attempts 1-6 all allowed (blocks only on attempt 7)
- Correct version: attempts 1-5 allowed, attempt 6 blocked

### Why this matters

In a sign-in rate limiter, this is a security defect. If the limit is meant to stop
brute-force attacks at 5 attempts, the buggy version allows 6. On a 6-digit PIN
(1,000,000 combinations), this is a 20% increase in attack surface per window.

Worth noting that the bug is *constant*, not compounding. Every window grants the same
one extra attempt regardless of how many windows have gone before, so this is a 20%
increase on the per-window budget rather than an unbounded leak. That bounds the severity
- it is still a real defect worth fixing, but it is not the kind of bug that gets worse
the longer it is left in.

### How I found it

I traced through the function with count = 5 (the limit):
- Buggy: step 4 checks `5 > 5` ? false ? allows the attempt
- Correct: step 4 checks `5 >= 5` ? true ? blocks the attempt

The two pseudocode versions differ only at step 4.

The reason the trace found it and a visual diff did not is worth recording. The two
functions are six steps long and identical in five of them; the bug sits in the one
boolean that a reader's eye skips over precisely because everything around it looks
familiar. Writing the same function twice, independently and in the same format, turns
"that comparison looks wrong" into "this is the only character that changed" - which is a
much stronger claim than a suspicion.
