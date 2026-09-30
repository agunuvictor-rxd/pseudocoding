# Pseudocoding

## What this repository is

This repository contains all deliverables.
Organised into three parts:

| Folder | Contents |
|--------|----------|
| `part-a/own/` | Pseudocode for three functions I wrote myself |
| `part-a/open-source/` | Pseudocode for three open-source functions (bcrypt) |
| `part-a/planted-bug/` | Bug identification using the two-pseudocode method |
| `part-b/` | Feature pseudocode + my hand-written implementation |
| `part-c/` | AI implementation, reverse-engineered pseudocode, difference table, 10-input comparison |

---

## The pseudocode standard I used

Every block follows this exact format:

```
FUNCTION name
INPUTS:  <name> (<type>) � <what it means>
OUTPUT:  <what is returned> (<type>)
SIDE EFFECTS:  <anything written, sent, or changed outside this function, or NONE>
FAILS WHEN:  <every condition that makes this function unable to succeed>

1. First step � one action, plain English, present tense.
2. IF some condition
     RETURN error: reason
   OTHERWISE
     continue
3. FOR EACH item in the list
     process item
   END FOR
4. CALL external service (may fail, may be slow)
5. WRITE record to database
6. RETURN result
```

### Rules I followed
- One action per numbered step
- Plain English, present tense � never code syntax
- Every branch is named (IF � OTHERWISE � END IF)
- Every loop names what it iterates (FOR EACH � END FOR)
- Every early exit is explicit (RETURN error: �)
- External calls are marked (CALL � may fail, may be slow)
- State changes are marked (WRITE � to database)

---

## What I learned

### From Part A � reading my own code
My biggest mistake was in the proration calculation. I wrote "divide and round" but
the code uses Math.floor everywhere. When I hand-traced the edge case of 1 remaining day,
my trace said a higher credit than the code actually produced.
Fix: "take the floor of" not "divide".

### From Part A � open-source (bcrypt)
I wrote bcrypt.compare as one step: "check if password matches hash".
The AI broke it into: (1) extract salt from stored hash, (2) re-hash the plaintext
with that salt, (3) compare byte-for-byte. Reading the source confirmed the AI was right.
Lesson: vague pseudocode produces vague code from an AI.

### From Part B and C � specifying before building
My implementation and the AI's agreed on 9 of 10 test inputs.
The one disagreement: I had written "check if the customer has already used this code"
but had not specified *when* � before or after the expiry check. My code did it after;
the AI did it before. Both are reasonable. Lesson: pseudocode must specify order.

### The non-technical listener test
After explaining the discount-code feature, a friend member said:
"A discount is granted only if the code is still valid." That is exactly right.

---

## Source project
Functions in part-a/own/ comes from my Payment and Subscription project.
