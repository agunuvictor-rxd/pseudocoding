# os-03 - bcrypt.compare (Harder function - took longest to follow)

**Library:** bcrypt (npm package)
**Function:** `compare(data, encrypted)`

The hardest of the three to follow, and the one where being wrong mattered most. My
first pass was a correct description of an insecure function: three steps, one of which
said "compare" and nothing else.

---

## My first-pass pseudocode (written WITHOUT AI)

```
FUNCTION compare
INPUTS:
  data (string)      - the plaintext password the user typed in
  encrypted (string) - the stored bcrypt hash from the database
OUTPUT:
  match (boolean) - true if data hashes to the same value as encrypted, false otherwise
SIDE EFFECTS: NONE
FAILS WHEN:
  - data is null or undefined
  - encrypted is not a valid bcrypt hash string

1. Check that both inputs are valid.
   IF data is null
     THROW an error
   END IF
   IF encrypted is not a valid bcrypt hash string
     THROW an error
   END IF

2. Extract the salt from the encrypted string.
   (The first 29 characters of a bcrypt hash contain the version, cost, and salt.)

3. Hash the data using the extracted salt and the cost factor from encrypted.
   CALL hash(data, salt) - this is the same algorithm as bcrypt.hash (slow).

4. Compare the result of step 3 with encrypted.
   IF they match
     RETURN true
   OTHERWISE
     RETURN false
   END IF
```

---

## AI explanation comparison

The AI said:

- Step 2: the salt is the first 29 characters specifically (7 for prefix/cost, 22 for salt).
- Step 4: the comparison uses a **constant-time comparison** function, NOT a regular
  string equality check. This prevents timing attacks where an attacker learns information
  from how long the comparison takes.
- The result can be subtly wrong if you use `===` instead of a timing-safe compare.

**Where my understanding differed:**

- I wrote "compare the result" and assumed a normal `===` check. The AI said it is a
  constant-time comparison. Reading the source confirmed the AI was right. This is a
  security-critical detail I missed.

**Who was right:** the AI, on constant-time comparison. This is the most important
difference in the set - had I implemented a compare function from my own pseudocode, I
would have introduced a timing attack vulnerability.

**Key lesson:** "Compare two strings" sounds simple but hides a security decision. Good
pseudocode must say "compare in constant time", not just "compare".

**The attack this hides.** A plain `===` returns as soon as two bytes differ, so its
runtime is a function of how many leading bytes matched. Against a 60-character bcrypt
hash an attacker can retry cheaply and measure, learning one byte at a time about the
stored hash. A constant-time compare walks all 60 bytes regardless. The step is not
slower in any way that matters - it is the same order of magnitude - so there is no
trade-off being made here, only a decision to make or fail to make.

---

## Corrected pseudocode for step 4

```
4. Compare the result of step 3 with encrypted using a CONSTANT-TIME comparison
   (so the time taken does not reveal how many characters matched).
   IF they are identical
     RETURN true
   OTHERWISE
     RETURN false
   END IF
```

This is the only line in the entire part-a set that I changed in the pseudocode itself
rather than in a note beside it. The original was wrong, and leaving it as the operative
description would have been worse than having no pseudocode at all.

---

## Hand-Trace Table

| Input | Expected | My trace | Real output | Match? |
|-------|----------|----------|-------------|--------|
| data="Hunter2!", encrypted=hash of "Hunter2!" | true | steps 2-3 reproduce the same hash; step 4 matches | true | ? |
| data="wrong", encrypted=hash of "Hunter2!" | false | step 3 produces a different hash; step 4 no match | false | ? |
| data=null, encrypted=valid hash | throws | step 1 catches | throws | ? |
