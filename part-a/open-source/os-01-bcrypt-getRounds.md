# os-01 - bcrypt.getRounds (Short function)

**Library:** bcrypt (npm package)
**Function:** `getRounds(encryptedPassword)`
**Source:** node_modules/bcrypt (underlying bcryptjs logic)

The shortest of the three open-source functions, and the one where the AI was right
about an implementation detail I had described only in terms of logic. Both readings
produce the same number; only one of them would survive being written down as code.

---

## My first-pass pseudocode (written WITHOUT AI)

```
FUNCTION getRounds
INPUTS:
  encryptedPassword (string) - a bcrypt hash string (e.g. "$2b$10$...")
OUTPUT:
  rounds (number) - the cost factor used when the hash was created
SIDE EFFECTS: NONE
FAILS WHEN:
  - encryptedPassword is not a valid bcrypt hash string
  - encryptedPassword does not start with a recognised bcrypt prefix ($2a$, $2b$, $2y$)

1. Check that encryptedPassword is a non-empty string.
   IF it is empty or not a string
     THROW an error saying the hash is invalid
   END IF

2. Read the cost factor from the hash string.
   (A bcrypt hash is structured: $<version>$<cost>$<22-char salt><31-char hash>)
   Extract the number between the second and third dollar signs.

3. Parse that extracted number as an integer.

4. RETURN the integer.
```

---

## AI explanation (compared after my pass)

The AI explained the same flow but was more precise in two places:

- The cost factor sits at fixed character positions 4-5 of a standard hash, and the
  function reads it with `parseInt` on a slice of the string.
- It does NOT validate whether the rest of the hash is well-formed. Only the prefix is
  checked.

**Differences:**

1. I wrote "check that encryptedPassword is a non-empty string". The AI said the library
   actually does check the prefix and throws a specific error type
   (`bcrypt.INVALID_HASH_PREFIX`) when it is not one of $2a, $2b, $2y. My version implied
   an emptiness check, which is the weaker test - a non-empty string of pure garbage
   would pass mine and fail the library's.
2. I wrote "read the number between the second and third dollar signs" - logically
   correct, but the AI was right that the implementation uses fixed offsets rather than
   scanning for `$`. A hash containing an unexpected extra `$` would break my description
   and not the real code.

**Who was right:** Both were mostly right. I had the logic; the AI had the
implementation. Reading the source confirmed the fixed-offset detail, and I have kept my
original pseudocode above unedited so the difference is visible rather than smoothed over.

---

## Hand-Trace Table

| Input | Expected rounds | Trace result | Real output | Match? |
|-------|-----------------|--------------|-------------|--------|
| `"$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ123456"` | 10 | parse("10") = 10 | 10 | ? |
| `"$2b$12$..."` | 12 | parse("12") = 12 | 12 | ? |
| `"notahash"` | throws | step 1 catches | throws | ? |
