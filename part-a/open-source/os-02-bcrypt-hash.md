# os-02 - bcrypt.hash (Medium function)

**Library:** bcrypt (npm package)
**Function:** `hash(data, saltOrRounds)`

Of the three open-source functions, this is the one where the shape of the code was right
and the *description of what the code does* was wrong in two places. Both mistakes were
in the same direction: I wrote what the function felt like rather than what it computed.

---

## My first-pass pseudocode (written WITHOUT AI)

```
FUNCTION hash
INPUTS:
  data (string)          - the plaintext password to hash
  saltOrRounds (number | string) - either an integer cost factor (e.g. 10)
                                   or a pre-generated salt string
OUTPUT:
  hashedPassword (string) - the bcrypt hash of data
SIDE EFFECTS: NONE
FAILS WHEN:
  - data is null or undefined
  - saltOrRounds is not a number or a valid salt string
  - saltOrRounds is a number less than 1 or greater than 31

1. Check that data is a non-null string.
   IF data is null or not a string
     THROW an error
   END IF

2. Check what type saltOrRounds is.
   IF saltOrRounds is a number
     Generate a random salt using that number as the cost factor.
     (This involves generating 16 random bytes and encoding them in base64.)
   OTHERWISE (it is already a salt string)
     Use saltOrRounds directly as the salt.
   END IF

3. Run the bcrypt key-expansion algorithm on data using the salt.
   This is computationally slow on purpose (the cost factor controls how slow).
   The algorithm performs 2^cost iterations of the Blowfish cipher setup.

4. Combine the version prefix, cost factor, salt, and hashed output
   into a single formatted string.

5. RETURN the formatted bcrypt hash string.
```

---

## AI explanation comparison

The AI said:

- Step 3 (the Blowfish expansion) uses the EksBlowfish key schedule, not plain Blowfish.
  The "Eks" stands for "Expensive Key Schedule".
- The salt is 22 characters of base64url encoding from 16 random bytes.
- The output is always exactly 60 characters.

**Where my understanding differed:**

- I wrote "16 random bytes encoded in base64". bcrypt uses a *modified* base64 alphabet,
  with a different character set from standard base64. The AI caught this; I missed it.
- I wrote "2^cost iterations of the Blowfish cipher" - close, but not precise. It is
  2^cost iterations of the key *setup*, not 2^cost encryptions. The AI was right.
- I was RIGHT that step 5 combines version + cost + salt + hash. The AI confirmed it.

**Reading the source confirmed:** the AI was more precise on the algorithm internals. My
high-level flow was correct; the details of the modified base64 and the key schedule were
not.

**Why the first two matter more than they look.** Both errors are the kind that survive
review because each produces something that still hashes. If I had implemented from my own
pseudocode, the salt would have been encoded in the wrong alphabet and the output would
have been 60 characters of something that no bcrypt `compare` could ever match against a
validly-generated hash. Nothing in my step 3 - "run the key-expansion algorithm" - would
have caught it. That is the specific failure this exercise is about: a step that names an
operation without naming what the operation *is*.

---

## Hand-Trace Table

| Input | Action | Expected output |
|-------|--------|----------------|
| data="password", rounds=10 | generate salt (22 chars), run EksBlowfish 1024 times | 60-char bcrypt string starting with $2b$10$ |
| data="", rounds=10 | valid - empty string is hashable | valid 60-char hash |
| data=null, rounds=10 | step 1 catches null | throws error |

The 2^cost figure is the reason this function is worth pseudocoding carefully: at the
default cost of 10 that is 1024 key-schedule iterations, and the cost factor is stored in
the hash itself precisely so it can be raised later without invalidating old hashes. The
number is not an implementation detail, it is the security parameter.
