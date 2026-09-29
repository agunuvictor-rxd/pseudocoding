# Part B - Discount Code Feature: Pseudocode

**Feature:** Apply a discount code to an order.

**Rules:**
- A code has an expiry date (it fails after this date)
- A code has a minimum spend (it fails if the cart total is below this)
- A code is single-use per customer (it fails if this customer has used it before)
- A valid code returns the discounted total

Two functions, and the split between them is the design decision that matters: validation
is pure and can be retried, redemption is the write. Keeping them apart means the
checkout UI can call validate repeatedly as the customer types without ever touching the
usage table, and only commits once at payment.

---

## FUNCTION 1: validateDiscountCode

```
FUNCTION validateDiscountCode
INPUTS:
  code (string)    - the discount code the customer entered (e.g. "SAVE20")
  customerId (string) - the unique ID of the customer applying the code
  cartTotalPence (number) - the total value of the cart in pence (integer, never fractional)
  now (Date, optional) - current time; defaults to actual current time (for testing)
OUTPUT:
  { valid: true, discountPence: number, finalTotalPence: number }
  OR
  { valid: false, reason: "not_found" | "expired" | "below_minimum" | "already_used" }
SIDE EFFECTS:
  - READS from database (discount_codes table)
  - READS from database (discount_code_usages table)
FAILS WHEN:
  - code is empty or not a string
  - customerId is empty or not a string
  - cartTotalPence is negative or not an integer
  - Database is unavailable (throws - not caught here)

1. Validate inputs.
   IF code is empty or not a string
     RETURN { valid: false, reason: "not_found" }
   END IF
   IF cartTotalPence is negative
     RETURN { valid: false, reason: "below_minimum" }
   END IF

2. Set now to the provided value if given, otherwise use the current moment.

3. Normalise the code: convert to uppercase and strip leading/trailing whitespace.

4. CALL database to look up the discount code record by normalised code string.
   (may be slow)

   IF no record is found
     RETURN { valid: false, reason: "not_found" }
   END IF

5. Check whether the code has expired.
   IF now is after the code's expiresAt date
     RETURN { valid: false, reason: "expired" }
   END IF

6. Check whether the cart meets the minimum spend requirement.
   IF cartTotalPence is less than the code's minimumSpendPence
     RETURN { valid: false, reason: "below_minimum" }
   END IF

7. CALL database to check whether this customerId has already used this code.
   Count the number of rows in discount_code_usages where codeId = record.id AND customerId = customerId.
   (may be slow)

   IF the count is greater than 0
     RETURN { valid: false, reason: "already_used" }
   END IF

8. Calculate the discount amount.
   IF the code is a percentage discount
     discountPence = floor(cartTotalPence * code.percentOff / 100)
   OTHERWISE (fixed amount discount)
     discountPence = code.amountOffPence
   END IF

9. Calculate finalTotalPence as cartTotalPence minus discountPence.
   IF finalTotalPence would be negative
     set finalTotalPence to 0
   END IF

10. RETURN { valid: true, discountPence, finalTotalPence }
```

Note that steps 4 and 7 are two separate round trips to the database and neither is
optional. The expiry and minimum-spend checks in between operate on the record from step
4, and the already-used check needs the record's id, so it cannot be hoisted above the
lookup without restructuring the query.

---

## FUNCTION 2: redeemDiscountCode

```
FUNCTION redeemDiscountCode
INPUTS:
  code (string)       - the discount code string (normalised)
  customerId (string) - the customer redeeming the code
  orderId (string)    - the order this redemption is attached to
OUTPUT:
  NONE (void)
SIDE EFFECTS:
  - WRITE to database: inserts a row into discount_code_usages
FAILS WHEN:
  - The code does not exist in the database (throws)
  - Database is unavailable (throws)
  - A row for this customerId + codeId already exists (unique constraint - throws if called twice)

1. CALL database to look up the discount code record by normalised code string.
   IF not found
     THROW error: "discount code not found"
   END IF

2. WRITE to database: insert a new row into discount_code_usages with:
   - codeId = record.id
   - customerId = customerId
   - orderId = orderId
   - usedAt = current timestamp

3. RETURN (no value)
```

This function deliberately does *not* re-check expiry, minimum spend, or prior use. The
unique constraint on (codeId, customerId) is what makes a double redemption impossible, and
repeating the business rules here would create a second place for them to drift. A caller
is expected to have run validateDiscountCode first; the constraint catches the case where
two concurrent checkouts both passed validation before either wrote.

---

## Hand-Trace Table (5 inputs traced before writing code)

**Test data:**
- Code "SAVE20" exists: 20% off, expires 2027-01-01, minimum spend 10.00 (1000p), per-customer single use
- Customer "cust-A" has NOT used SAVE20
- Customer "cust-B" HAS used SAVE20

| # | Input | Step where it stops | Expected output |
|---|-------|--------------------|----|
| 1 | code="SAVE20", cust="cust-A", cart=5000p, now=2026-06-01 | Step 10 | { valid:true, discount:1000p, total:4000p } |
| 2 | code="SAVE20", cust="cust-A", cart=500p (below 10.00 min) | Step 6 | { valid:false, reason:"below_minimum" } |
| 3 | code="SAVE20", cust="cust-B", cart=5000p | Step 7 | { valid:false, reason:"already_used" } |
| 4 | code="SAVE20", cust="cust-A", cart=5000p, now=2027-06-01 (expired) | Step 5 | { valid:false, reason:"expired" } |
| 5 | code="BADCODE", cust="cust-A", cart=5000p | Step 4 | { valid:false, reason:"not_found" } |

**Negative quantity check:** If cartTotalPence = -100 ? step 1 catches ? { valid:false, reason:"below_minimum" }
