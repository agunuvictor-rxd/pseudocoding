/**
 * Part B – My hand-written implementation of the discount code feature.
 * Written step-by-step from the pseudocode in pseudocode.md.
 * NO AI was used in this file.
 *
 * Each numbered comment maps directly to a pseudocode step.
 */

// -- Types --------------------------------------------------------------------

type DiscountCode = {
  id: string;
  code: string;           // normalised uppercase
  percentOff: number | null;    // e.g. 20 for 20%
  amountOffPence: number | null; // fixed amount in pence
  minimumSpendPence: number;
  expiresAt: Date;
};

type ValidateResult =
  | { valid: true; discountPence: number; finalTotalPence: number }
  | { valid: false; reason: "not_found" | "expired" | "below_minimum" | "already_used" };

// Fake in-memory "database" for testing (replace with real DB calls in prod)
const codesDB: DiscountCode[] = [
  {
    id: "code-1",
    code: "SAVE20",
    percentOff: 20,
    amountOffPence: null,
    minimumSpendPence: 1000,
    expiresAt: new Date("2027-01-01"),
  },
  {
    id: "code-2",
    code: "TENOFF",
    percentOff: null,
    amountOffPence: 1000,
    minimumSpendPence: 500,
    expiresAt: new Date("2027-06-01"),
  },
];

const usagesDB: { codeId: string; customerId: string; orderId: string; usedAt: Date }[] = [];

// -- validateDiscountCode -----------------------------------------------------

export function validateDiscountCode(
  code: string,
  customerId: string,
  cartTotalPence: number,
  now: Date = new Date()
): ValidateResult {

  // STEP 1 – Validate inputs
  if (!code || typeof code !== "string") {
    return { valid: false, reason: "not_found" };
  }
  if (cartTotalPence < 0) {
    return { valid: false, reason: "below_minimum" };
  }

  // STEP 2 – now is already set via default parameter

  // STEP 3 – Normalise the code
  const normalisedCode = code.toUpperCase().trim();

  // STEP 4 – Look up the discount code record
  const record = codesDB.find((c) => c.code === normalisedCode) ?? null;
  if (!record) {
    return { valid: false, reason: "not_found" };
  }

  // STEP 5 – Check expiry
  if (now > record.expiresAt) {
    return { valid: false, reason: "expired" };
  }

  // STEP 6 – Check minimum spend
  if (cartTotalPence < record.minimumSpendPence) {
    return { valid: false, reason: "below_minimum" };
  }

  // STEP 7 – Check single-use per customer
  const usageCount = usagesDB.filter(
    (u) => u.codeId === record.id && u.customerId === customerId
  ).length;
  if (usageCount > 0) {
    return { valid: false, reason: "already_used" };
  }

  // STEP 8 – Calculate discount
  let discountPence: number;
  if (record.percentOff !== null) {
    // Percentage discount – take the floor (no fractional pence)
    discountPence = Math.floor((cartTotalPence * record.percentOff) / 100);
  } else {
    // Fixed amount discount
    discountPence = record.amountOffPence!;
  }

  // STEP 9 – Calculate final total, clamped at 0
  const finalTotalPence = Math.max(0, cartTotalPence - discountPence);

  // STEP 10 – Return
  return { valid: true, discountPence, finalTotalPence };
}

// -- redeemDiscountCode -------------------------------------------------------

export function redeemDiscountCode(
  code: string,
  customerId: string,
  orderId: string
): void {

  // STEP 1 – Look up the code
  const normalisedCode = code.toUpperCase().trim();
  const record = codesDB.find((c) => c.code === normalisedCode);
  if (!record) {
    throw new Error(`Discount code not found: ${code}`);
  }

  // STEP 2 – Write usage record
  usagesDB.push({
    codeId: record.id,
    customerId,
    orderId,
    usedAt: new Date(),
  });

  // STEP 3 – Return (nothing to return)
}

// -- Test runner --------------------------------------------------------------

function runTests() {
  console.log("=== Part B Tests (5 traced inputs) ===\n");

  // Test 1: Normal valid usage
  const t1 = validateDiscountCode("SAVE20", "cust-A", 5000, new Date("2026-06-01"));
  console.log("Test 1 (normal):", JSON.stringify(t1));
  // Expected: { valid:true, discountPence:1000, finalTotalPence:4000 }

  // Test 2: Below minimum spend
  const t2 = validateDiscountCode("SAVE20", "cust-A", 500, new Date("2026-06-01"));
  console.log("Test 2 (below_minimum):", JSON.stringify(t2));
  // Expected: { valid:false, reason:"below_minimum" }

  // Test 3: Already used (simulate cust-B having used it)
  redeemDiscountCode("SAVE20", "cust-B", "order-prev");
  const t3 = validateDiscountCode("SAVE20", "cust-B", 5000, new Date("2026-06-01"));
  console.log("Test 3 (already_used):", JSON.stringify(t3));
  // Expected: { valid:false, reason:"already_used" }

  // Test 4: Expired
  const t4 = validateDiscountCode("SAVE20", "cust-A", 5000, new Date("2027-06-01"));
  console.log("Test 4 (expired):", JSON.stringify(t4));
  // Expected: { valid:false, reason:"expired" }

  // Test 5: Code does not exist
  const t5 = validateDiscountCode("BADCODE", "cust-A", 5000, new Date("2026-06-01"));
  console.log("Test 5 (not_found):", JSON.stringify(t5));
  // Expected: { valid:false, reason:"not_found" }

  // Extra: negative quantity
  const t6 = validateDiscountCode("SAVE20", "cust-A", -100);
  console.log("Test 6 (negative cart):", JSON.stringify(t6));
  // Expected: { valid:false, reason:"below_minimum" }
}

runTests();
