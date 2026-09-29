# own-02 - authorize (Touches Authentication / Authorisation)

**Source file:** `lib/auth.ts` - the `authorize` function inside `authConfig.providers`

---

## The failure ladder

This function has five ways to refuse a sign-in, and only one of them returns quietly.
Three of the five throw the *same* error on purpose, and that is the interesting part.

| Order | Condition | Result | Does it tell the caller why? |
|-------|-----------|--------|------------------------------|
| 1 | Caller's IP over 5 attempts in 15 min | THROW InvalidCredentialsError | No - rate limiting is hidden |
| 2 | Credentials fail schema validation | RETURN null | No - NextAuth shows a generic error |
| 3 | No user exists with that email | THROW InvalidCredentialsError | No |
| 4 | Password does not match the stored hash | THROW InvalidCredentialsError | No |
| 5 | `emailVerified` is null | THROW EmailNotVerifiedError | Yes |

Rows 1, 3 and 4 are indistinguishable from outside the function: same error type, same
shape of response. That is deliberate. If "no such account" and "wrong password" produce
different errors or different timings, the endpoint can be used to enumerate which emails
are registered.

The cost of that choice is real, though. A legitimate user who trips the rate limit is
told they typed their password wrong, and has no way to learn that waiting is the fix.
Step 2's `RETURN null` is a second quiet failure for the same reason - it lets NextAuth
render its own generic form-level message rather than leaking a validation error that
would confirm the email format was the problem.

---

## Pseudocode

```
FUNCTION authorize
INPUTS:
  credentials (object) - contains raw email (string) and raw password (string)
  request (Request)    - the HTTP request, used to extract the caller's IP address
OUTPUT:
  user object {id, email, name} (object) if authentication succeeds
  OR null if credentials are malformed (causes NextAuth to show generic error)
SIDE EFFECTS:
  - READS from the rate-limit in-memory bucket (checkRateLimit)
  - READS from the database to look up the user
FAILS WHEN:
  - The caller's IP has exceeded 5 sign-in attempts in the last 15 minutes
    (throws InvalidCredentialsError - hides whether the account exists)
  - The email/password do not pass schema validation (returns null)
  - No user exists with that email (throws InvalidCredentialsError)
  - The password does not match the stored hash (throws InvalidCredentialsError)
  - The user's email address has not been verified (throws EmailNotVerifiedError)

1. Extract the caller's IP address from the x-forwarded-for request header.
   IF x-forwarded-for is present
     take only the first IP in the comma-separated list and strip whitespace
   OTHERWISE
     try x-real-ip header
     IF x-real-ip is also absent
       use the string "unknown"
     END IF
   END IF

2. CALL checkRateLimit with key "signin:<IP>", limit 5, window 15 minutes
   (reads from in-memory bucket - fast, no external call)

   IF the rate limit is exceeded
     THROW InvalidCredentialsError
     (do NOT reveal that the limit was hit - hide behind generic error)
   END IF

3. Validate the raw credentials against the sign-in schema (email format, password non-empty).
   IF validation fails
     RETURN null
   END IF

4. Extract the validated email and password from the parsed result.

5. Normalise the email (lowercase, trim whitespace).

6. CALL database to look up user by normalised email (may be slow).

   IF no user is found
     THROW InvalidCredentialsError
   END IF

7. CALL bcrypt.compare to check the raw password against the stored password hash (slow - CPU-bound).

   IF the password does not match
     THROW InvalidCredentialsError
   END IF

8. Check whether the user's emailVerified field is set.
   IF emailVerified is null or falsy
     THROW EmailNotVerifiedError
   END IF

9. RETURN an object containing the user's id, email, and name.
```

---

## Three walks down the ladder

**Walk 1 - sign-in succeeds.** Caller sends `x-forwarded-for: 10.0.0.1` and
`{email: "a@b.com", password: "Hunter2!"}`, and the account is verified.

| Step | Action | Result |
|------|--------|--------|
| 1 | first IP in the list is "10.0.0.1" | ip = "10.0.0.1" |
| 2 | checkRateLimit("signin:10.0.0.1", 5, 900000) - first attempt | allowed = true |
| 3 | signinSchema accepts the pair | success |
| 4 | email = "a@b.com", password = "Hunter2!" | - |
| 5 | normaliseEmail gives "a@b.com" | - |
| 6 | DB findUnique finds the user, `emailVerified` is a Date | user object |
| 7 | bcrypt.compare("Hunter2!", hash) | true |
| 8 | `emailVerified` is set | continue |
| 9 | RETURN {id, email, name} | logged in |

Real code output: matches.

**Walk 2 - sixth attempt from the same IP.** Stops at row 1 of the ladder.

| Step | Action | Result |
|------|--------|--------|
| 1 | IP = "10.0.0.1" | - |
| 2 | checkRateLimit sees count already at 5 | allowed = false |
| 2 | THROW InvalidCredentialsError | THROWN |

Real code output: throws InvalidCredentialsError.

Note what never happens: the email is never read, the database is never queried, and
bcrypt never runs. The rate limit sits *above* the credential check precisely so a
brute-force attempt costs no hashing work.

**Walk 3 - correct password, unverified email.** Stops at row 5, the last rung.

| Step | Action | Result |
|------|--------|--------|
| 1-5 | normal path through IP extraction and normalisation | - |
| 6 | DB findUnique finds the user, `emailVerified` = null | user object |
| 7 | bcrypt.compare | true |
| 8 | `emailVerified` is null | THROW EmailNotVerifiedError |

Real code output: throws EmailNotVerifiedError.

This is the only walk that reaches row 5, and it is the only failure the caller can
act on, because it is the only one whose error type is unique.
