# Part C - Reverse-Engineered Pseudocode

This pseudocode was written by reading ai-implementation.ts ONLY. The original pseudocode
from part-b/pseudocode.md was NOT consulted during this exercise.

Reading the code rather than the spec turned up something the spec never mentions: step 3
in my original pseudocode is described in a fixed order, and the implementation resolves
`code` in a different order. The reverse read makes it obvious that "convert to uppercase
and strip whitespace" was a description of a *result*, not of a *sequence* - the two
operations do not need to happen in the order I wrote them, and any reasonable implementer
would pick their own.

---

## FUNCTION validateDiscountCode (reverse-engineered from AI code)

```
FUNCTION validateDiscountCode
INPUTS:
  code (string)          - discount code the user typed
  customerId (string)    - ID of the customer
  cartTotalPence (number) - cart value in pence
  now (Date, optional)   - current time, defaults to actual now
OUTPUT:
  { valid: true, discountPence, finalTotalPence }  OR
  { valid: false, reason: "not_found" | "expired" | "below_minimum" | "already_used" }
SIDE EFFECTS:
  - READS from codesDB
  - READS from usagesDB
FAILS WHEN:
  - code is falsy or not a string (returns not_found)
  - cartTotalPence is negative (returns below_minimum)

1. IF code is falsy or not a string
     RETURN { valid: false, reason: "not_found" }
   END IF

2. IF cartTotalPence is less than 0
     RETURN { valid: false, reason: "below_minimum" }
   END IF

3. Normalise code: strip whitespace and convert to uppercase.

4. Look up the code in codesDB by the normalised string.
   IF not found
     RETURN { valid: false, reason: "not_found" }
   END IF

5. Count how many times this customerId has used this code.
   IF count is greater than 0
     RETURN { valid: false, reason: "already_used" }
   END IF

6. IF now is after the code's expiresAt
     RETURN { valid: false, reason: "expired" }
   END IF

7. IF cartTotalPence is less than code's minimumSpendPence
     RETURN { valid: false, reason: "below_minimum" }
   END IF

8. IF code has a percentOff value
     discountPence = floor(cartTotalPence * percentOff / 100)
   OTHERWISE
     discountPence = code's fixed amountOffPence
   END IF

9. finalTotalPence = max(0, cartTotalPence - discountPence)

10. RETURN { valid: true, discountPence, finalTotalPence }
```

**What reading the code exposed that the spec did not say:**

- The already-used check sits at position 5, ahead of both the expiry and minimum-spend
  checks. In the original it was step 7, after both. Nothing in the spec marked the order
  as load-bearing, so this was a legal reading - and it is the only difference in the file
  that changes any output.
- The normalisation step is written "strip whitespace and convert to uppercase", the
  reverse of the original wording. Functionally identical for these inputs, since neither
  operation interferes with the other.
- The implementation does not validate `customerId` at all, even though the original
  `FAILS WHEN` listed it. Neither does my own implementation - this is a shared omission
  rather than an AI deviation, and it belongs in the pseudocode fix, not in the difference
  table.

---

## FUNCTION redeemDiscountCode (reverse-engineered)

```
FUNCTION redeemDiscountCode
INPUTS:
  code (string)
  customerId (string)
  orderId (string)
OUTPUT:
  NONE
SIDE EFFECTS:
  - WRITES to usagesDB

1. Normalise code.
2. Look up code in codesDB.
   IF not found
     THROW error
   END IF
3. WRITE usage record to usagesDB with codeId, customerId, orderId, usedAt=now.
4. RETURN
```

Unchanged from the original apart from the step granularity - the implementation splits
normalise and lookup into separate statements where the pseudocode had them implied, which
is a formatting difference and not a behavioural one.
