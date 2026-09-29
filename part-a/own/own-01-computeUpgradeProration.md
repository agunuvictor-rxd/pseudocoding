# own-01 - computeUpgradeProration (Most Complex Function)

**Source file:** `lib/billing/proration.ts`

---

## What the first pass got wrong

Two errors, both caught by hand-tracing before I re-read the output.

**1. "Divide and round" is not what the code does.** My first draft said the credit was
rounded. The real code floors both divisions. The 1-day-remaining case is what separates
the two readings: rounding predicts 16,667 kobo, flooring produces 16,666. My trace gave
the rounded number. The pseudocode below now says FLOOR at both steps 7 and 8.

**2. The expired-period case is not a failure.** I originally listed it under
`FAILS WHEN`. It is an unconditional clamp inside step 6, so this function has no failure
path at all - every input returns a valid, non-negative result.

---

## Pseudocode

```
FUNCTION computeUpgradeProration
INPUTS:
  input (ProrationInput object) containing:
    - currentPeriodEnd (Date)   - when the user's current monthly period ends
    - monthlyPriceKobo (number, optional) - monthly plan price in kobo; defaults to MONTHLY_PRICE_KOBO
    - monthlyPeriodDays (number, optional) - days in a monthly period; defaults to MONTHLY_PERIOD_DAYS (30)
    - yearlyPriceKobo (number, optional)   - yearly plan price in kobo; defaults to YEARLY_PRICE_KOBO
    - yearlyPeriodDays (number, optional)  - days in a yearly period; defaults to YEARLY_PERIOD_DAYS (365)
    - now (Date, optional)                 - current time; defaults to the actual current time
OUTPUT:
  ProrationResult (object) containing remainingDays, creditKobo, payableKobo,
  newPeriodStart, newPeriodEnd
SIDE EFFECTS: NONE
FAILS WHEN:
  - Never throws; all edge cases produce valid (non-negative) numbers

1. Set monthlyPriceKobo to input.monthlyPriceKobo if provided, otherwise use the system default.
2. Set monthlyPeriodDays to input.monthlyPeriodDays if provided, otherwise use the system default (30).
3. Set yearlyPriceKobo to input.yearlyPriceKobo if provided, otherwise use the system default.
4. Set yearlyPeriodDays to input.yearlyPeriodDays if provided, otherwise use the system default (365).
5. Set now to input.now if provided, otherwise use the current moment in time.
6. Calculate remainingMs as the difference between currentPeriodEnd and now in milliseconds.
   IF remainingMs would be negative (the period has already ended)
     clamp remainingMs to 0
   END IF
7. Calculate remainingDays by dividing remainingMs by the number of milliseconds in one day,
   then taking the FLOOR (whole days only - never fractional).
8. Calculate creditKobo by multiplying monthlyPriceKobo by remainingDays,
   dividing by monthlyPeriodDays, then taking the FLOOR (whole kobo only - never fractional).
9. Calculate payableKobo as yearlyPriceKobo minus creditKobo.
   IF payableKobo would be negative
     set payableKobo to 0
   END IF
10. Set newPeriodStart to now.
11. Set newPeriodEnd by adding yearlyPeriodDays days to now.
12. RETURN an object containing remainingDays, creditKobo, payableKobo,
    newPeriodStart, and newPeriodEnd.
```

---

## Constants pulled from config/plans.ts

| Constant | Value | In local currency |
|----------|-------|-------------------|
| MONTHLY_PRICE_KOBO | 500000 | NGN 5,000 |
| MONTHLY_PERIOD_DAYS | 30 | 30 days |
| YEARLY_PRICE_KOBO | 4800000 | NGN 48,000 |
| YEARLY_PERIOD_DAYS | 365 | 365 days |
| DAY_MS | 86400000 | - |

---

## All three traces, side by side

Steps 1 to 5 are identical in every case, because no overrides are supplied and every
default applies. The table therefore starts at step 6. Inputs: `now = 2026-09-01`,
`currentPeriodEnd = 2026-09-16` for the first two, and a `currentPeriodEnd` in the past
for the third.

| Step | Normal: 15 days left | Edge: 1 day left | Expired: period already over |
|------|----------------------|------------------|-----------------------------|
| 6 | 2026-09-16 minus 2026-09-01 = 15 days x 86,400,000 = 1,296,000,000 ms | 86,400,000 ms | the difference would be negative, so it is clamped to 0 |
| 7 | floor(1,296,000,000 / 86,400,000) = **15** | floor(86,400,000 / 86,400,000) = **1** | floor(0 / 86,400,000) = **0** |
| 8 | floor(500,000 x 15 / 30) = **250,000** | floor(500,000 / 30) = floor(16,666.67) = **16,666** | floor(500,000 x 0 / 30) = **0** |
| 9 | max(0, 4,800,000 - 250,000) = **4,550,000** | max(0, 4,800,000 - 16,666) = **4,783,334** | max(0, 4,800,000 - 0) = **4,800,000** |
| 10-11 | start 2026-09-01, end 2027-09-01 | same | same |

**Returned objects, checked against the real code:**

| Case | Returned | Real code |
|------|----------|-----------|
| Normal | { remainingDays: 15, creditKobo: 250000, payableKobo: 4550000 } | matches |
| Edge | { remainingDays: 1, creditKobo: 16666, payableKobo: 4783334 } | matches |
| Expired | { remainingDays: 0, creditKobo: 0, payableKobo: 4800000 } | matches |

On the expired case the customer is charged the full yearly price and gets no credit.
That is the right outcome: there was nothing left on the old plan to refund.
