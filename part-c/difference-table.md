# Part C - Difference Table (Original vs Reverse-Engineered Pseudocode)

## Comparison: part-b/pseudocode.md  vs  part-c/reverse-pseudocode.md

| # | Location in original | Original pseudocode | AI/reverse pseudocode | Classification | Decision |
|---|---------------------|--------------------|-----------------------|----------------|----------|
| 1 | Step 7 (check already_used) | Checked AFTER expiry (step 5) and minimum spend (step 6) | Checked BEFORE expiry and minimum spend (became step 5 in AI) | **AI interpreted a step differently** - ambiguity in my pseudocode about ordering | Fix: add "in this order" to the FAILS WHEN section |
| 2 | Step 3 (normalise) | "convert to uppercase and strip leading/trailing whitespace" | "strip whitespace and convert to uppercase" - order reversed | AI added something slightly different | Functionally equivalent; both produce the same result |
| 3 | Step 4 (normalise call) | Uses `code.toUpperCase().trim()` in my code | Uses `code.trim().toUpperCase()` in AI code | **Interpretation difference** - trim vs toUpperCase order | Does not affect output; not a defect |
| 4 | None | No extra behaviour specified | No extra behaviour added | - | AI obeyed the "no additional behaviour" instruction correctly |

Row 4 is not a difference - it is the absence of one, listed to record that the
instruction was followed. Rows 2 and 3 are the same observation (the trim/toUpperCase
order) seen from the pseudocode side and the code side; they are kept as separate rows
because they are classified against different artefacts.

---

## Classification Key

| Type | Meaning |
|------|---------|
| AI added something not asked for | Unwelcome addition - usually a defect |
| AI omitted something specified | Defect - something I required is missing |
| AI interpreted differently | My pseudocode was ambiguous - fix the pseudocode |

---

## The one real difference (difference #1 explained)

**Original pseudocode order:**
1. Check expired ? return "expired"
2. Check minimum spend ? return "below_minimum"
3. Check already used ? return "already_used"

**AI's order:**
1. Check already used ? return "already_used"
2. Check expired ? return "expired"
3. Check minimum spend ? return "below_minimum"

**Why this matters (Test 10):**
When a customer has used a code AND the code is expired,
my implementation returns `"expired"` (expiry checked first).
The AI's implementation returns `"already_used"` (usage checked first).

**Which is correct?** Both are defensible. But the correct one depends on your business rule:
- If you want to tell customers their code is expired (so they know to find a new one) ? mine is better
- If you want to hide whether a code is expired to a user who already misused it ? AI is better

**The fix for my pseudocode:**
Add this line to FAILS WHEN:
> Failure checks run in this order: 1) not_found, 2) expired, 3) below_minimum, 4) already_used

---

## 10-Input Comparison Table

| Test | Input | My impl result | AI impl result | Agree? | Which is correct? |
|------|-------|----------------|----------------|--------|-------------------|
| T1 | SAVE20, cust-A, 5000p, 2026-06-01 | {valid:true, discount:1000, total:4000} | {valid:true, discount:1000, total:4000} | ? | Both |
| T2 | SAVE20, cust-A, 500p (below min) | {valid:false, "below_minimum"} | {valid:false, "below_minimum"} | ? | Both |
| T3 | SAVE20, cust-B (already used), 5000p | {valid:false, "already_used"} | {valid:false, "already_used"} | ? | Both |
| T4 | SAVE20, cust-A, expired (2027-06-01) | {valid:false, "expired"} | {valid:false, "expired"} | ? | Both |
| T5 | BADCODE, cust-A | {valid:false, "not_found"} | {valid:false, "not_found"} | ? | Both |
| T6 | TENOFF, cust-A, 5000p (fixed amount) | {valid:true, discount:1000, total:4000} | {valid:true, discount:1000, total:4000} | ? | Both |
| T7 | "save20" lowercase, cust-A | {valid:true} | {valid:true} | ? | Both (normalisation works) |
| T8 | SAVE20, cust-A, 1000p (exactly at minimum) | {valid:true} | {valid:true} | ? | Both |
| T9 | SAVE20, cust-A, 999p (1p below minimum) | {valid:false, "below_minimum"} | {valid:false, "below_minimum"} | ? | Both |
| T10 | SAVE20, cust-C (already used AND expired) | {valid:false, "expired"} | {valid:false, "already_used"} | ? | Depends on business rule (see above) |

**Summary:** 9 of 10 inputs agree. 1 disagrees due to ordering ambiguity in the pseudocode.

Worth noting which tests were built to probe and which were built to pass. T6 through T9
each target one specific decision - fixed-amount path, case normalisation, the inclusive
boundary at minimum spend, and the exclusive one just below it. T10 was constructed
specifically to make the ordering difference visible, since no other input can produce a
disagreement. T1 through T5 are the part-B cases, carried over so the two implementations
are compared on identical ground rather than on inputs chosen to flatter either one.

## Actual Console Output (Part C)

```json
=== Part C: AI Implementation - 10-input comparison ===

T1: {"valid":true,"discountPence":1000,"finalTotalPence":4000}
T2: {"valid":false,"reason":"below_minimum"}
T3: {"valid":false,"reason":"already_used"}
T4: {"valid":false,"reason":"expired"}
T5: {"valid":false,"reason":"not_found"}
T6: {"valid":true,"discountPence":1000,"finalTotalPence":4000}
T7: {"valid":true,"discountPence":1000,"finalTotalPence":4000}
T8: {"valid":true,"discountPence":200,"finalTotalPence":800}
T9: {"valid":false,"reason":"below_minimum"}
T10: {"valid":false,"reason":"already_used"}
```
