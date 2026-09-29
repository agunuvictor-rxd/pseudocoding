# own-03 - verifyToken (Handles an Error Path)

**Source file:** `lib/tokens.ts`

This one writes to the database on every branch. A verification token is single-use and
short-lived, so "invalid", "expired" and "valid" are three paths with three different
write patterns, and only one of them is a two-write transaction.

---

## Pseudocode

```
FUNCTION verifyToken
INPUTS:
  raw (string) - the raw 6-digit verification code received from the user
OUTPUT:
  { ok: true, userId: string }   if the token is valid and not expired
  { ok: false, reason: "invalid" | "expired" }  if it is not
SIDE EFFECTS:
  - READS from database (verificationToken table, including user)
  - WRITE (DELETE) expired token from database when found but expired
  - WRITE (DELETE + UPDATE) in a database transaction when valid:
      deletes the verification token record
      marks the user's emailVerified field with the current timestamp
FAILS WHEN:
  - Database is unavailable (throws database error - not caught here)

1. Hash the raw input using SHA-256 to produce a token hash.
   (Tokens are stored as hashes; we never look up by plaintext.)

2. CALL database to find a verification token record where token = hash,
   including the related user record. (may be slow)

   IF no record is found
     RETURN { ok: false, reason: "invalid" }
   END IF

3. Check whether the token's expiresAt timestamp is in the past.
   IF expiresAt is less than or equal to the current time
     CALL database to DELETE any records matching this token hash.
     RETURN { ok: false, reason: "expired" }
   END IF

4. CALL database to run a transaction containing two operations:
     a. DELETE the verification token record by its id.
     b. UPDATE the user record: set emailVerified to the current timestamp.
   (This is atomic - both succeed or neither does.)

5. RETURN { ok: true, userId: record.userId }
```

---

## The write pattern on each branch

| Branch | Reads | Writes | Transaction? |
|--------|-------|--------|--------------|
| "invalid" (step 2) | token table | nothing | no |
| "expired" (step 3) | token table | DELETE matching this hash | no |
| "valid" (step 4) | token table | DELETE by id, then UPDATE user | yes, both or neither |

Only the success path needs atomicity, because it touches two rows in two tables. A
partial write there would either burn the user's code without verifying their email, or
mark the email verified while leaving a live token behind that could be replayed. Neither
state is recoverable, so the transaction is load-bearing rather than tidy.

---

## Traces

### Input 1 - valid, non-expired code "123456"

`expiresAt` is 2 minutes in the future.

| Step | Action | Result |
|------|--------|--------|
| 1 | SHA-256("123456") = abc123... | hash computed |
| 2 | DB findUnique finds the record | record |
| 3 | expiresAt is later than now | not expired, continue |
| 4 | DB transaction: delete token, set emailVerified | committed |
| 5 | RETURN { ok: true, userId: "user-abc" } | success |

Real code output: matches.

### Input 2 - expired code, time has passed

`expiresAt` is 5 minutes in the past.

| Step | Action | Result |
|------|--------|--------|
| 1 | hash computed | - |
| 2 | DB findUnique finds the record | record |
| 3 | expiresAt is before now | IS expired |
| 3a | DELETE matching hash from DB | deleted |
| 3b | RETURN { ok: false, reason: "expired" } | failure |

Real code output: matches.

The delete at 3a is the only write on this branch. It is not cleanup for its own sake -
an expired row that is never removed is a row an attacker can keep guessing against, and
it also means the same expired code fails with the same answer every time.

### Input 3 - code that was never issued

| Step | Action | Result |
|------|--------|--------|
| 1 | hash computed | - |
| 2 | DB findUnique finds nothing | null |
| 2 | RETURN { ok: false, reason: "invalid" } | failure |

Real code output: matches.

Shortest path in the function, and the only one with no writes at all. Note the ordering
choice: the existence lookup happens *before* the expiry check, so a garbage code and an
expired code return different reasons. The same argument for hiding existence that applies
to `authorize` does not apply here, because the token is unguessable (six digits, hashed,
short-lived) and the caller has already proven they are the user by asking for this code.

---

## Error handling note

The deletion at step 3 uses `deleteMany`, not `delete`. This is deliberate: it avoids a
crash if the record was already cleaned up by a concurrent request between the findUnique
and the delete. My first pseudocode said "DELETE the record by id", which would fail if it
was gone. Corrected to "DELETE any records matching this hash".

The same concurrency gap does not exist on the success path, and that asymmetry is worth
noting. Step 4 deletes by id, which would throw on a missing row - but by that point the
row was just read inside the same transaction, so it is held and cannot vanish underneath
the delete.
