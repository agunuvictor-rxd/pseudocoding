# Part B - Trace vs Test Comparison

## How to run the tests

```bash
npx ts-node part-b/my-implementation.ts
```

---

## Results

| Test # | Input | Hand-trace result | Code output | Match? |
|--------|-------|------------------|-------------|--------|
| 1 | code="SAVE20", cust="cust-A", cart=5000p, now=2026-06-01 | {valid:true, discount:1000, total:4000} | {valid:true, discountPence:1000, finalTotalPence:4000} | ? |
| 2 | code="SAVE20", cust="cust-A", cart=500p | {valid:false, reason:"below_minimum"} | {valid:false, reason:"below_minimum"} | ? |
| 3 | code="SAVE20", cust="cust-B" (already used) | {valid:false, reason:"already_used"} | {valid:false, reason:"already_used"} | ? |
| 4 | code="SAVE20", cust="cust-A", now=2027-06-01 (expired) | {valid:false, reason:"expired"} | {valid:false, reason:"expired"} | ? |
| 5 | code="BADCODE", cust="cust-A" | {valid:false, reason:"not_found"} | {valid:false, reason:"not_found"} | ? |
| 6 | code="SAVE20", cart=-100 | {valid:false, reason:"below_minimum"} | {valid:false, reason:"below_minimum"} | ? |

All 6 tests passed. Every pseudocode step maps to exactly one piece of code. No code was
written that lacked a corresponding pseudocode step.

Two things about test 6 that are worth stating plainly, since it is the one that is not
obviously a feature. It passes for the *right* reason - step 1 catches the negative total
before the code is ever looked up - but the reason string it returns is
`below_minimum`, which is a slightly odd answer for "the cart total is not a number a
cart can have". A separate `invalid_cart` reason would be clearer to whoever ends up
reading a log line. I kept it as-is because the pseudocode specified it that way and
changing both would have moved the goalposts for the trace comparison; flagging it here
instead.

## Actual Console Output

```json
=== Part B Tests (5 traced inputs) ===

Test 1 (normal): {"valid":true,"discountPence":1000,"finalTotalPence":4000}
Test 2 (below_minimum): {"valid":false,"reason":"below_minimum"}
Test 3 (already_used): {"valid":false,"reason":"already_used"}
Test 4 (expired): {"valid":false,"reason":"expired"}
Test 5 (not_found): {"valid":false,"reason":"not_found"}
Test 6 (negative cart): {"valid":false,"reason":"below_minimum"}
```
