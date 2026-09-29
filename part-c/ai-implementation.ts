/**
 * Part C – AI-generated implementation.
 *
 * This file was produced by giving the pseudocode from part-b/pseudocode.md
 * to an AI coding agent with the instruction:
 *   "Implement this exactly, one function per pseudocode block, no additional behaviour."
 *
 * The prompt given was the full text of part-b/pseudocode.md.
 * Nothing else was said.
 */

// -- Types --------------------------------------------------------------------

type DiscountCode = {
  id: string;
  code: string;
  percentOff: number | null;
  amountOffPence: number | null;
  minimumSpendPence: number;
  expiresAt: Date;
};

type ValidateResult =
  | { valid: true; discountPence: number; finalTotalPence: number }
  | { valid: false; reason: "not_found" | "expired" | "below_minimum" | "already_used" };

// In-memory database (same as my-implementation.ts for a fair comparison)
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

// -- validateDiscountCode (AI version) ----------------------------------------

export function validateDiscountCode(
  code: string,
  customerId: string,
  cartTotalPence: number,
  now: Date = new Date()
): ValidateResult {
  // Step 1: validate inputs
  if (!code || typeof code !== "string") {
    return { valid: false, reason: "not_found" };
  }
  if (cartTotalPence < 0) {
    return { valid: false, reason: "below_minimum" };
  }

  // Step 3: normalise
  const normalised = code.trim().toUpperCase();

  // Step 4: look up code -- NOTE: AI checked already_used BEFORE expiry (see difference table)
  const record = codesDB.find((c) => c.code === normalised) ?? null;
  if (!record) {
    return { valid: false, reason: "not_found" };
  }

  // Step 7 (AI moved this up): check already used
  const usageCount = usagesDB.filter(
    (u) => u.codeId === record.id && u.customerId === customerId
  ).length;
  if (usageCount > 0) {
    return { valid: false, reason: "already_used" };
  }

  // Step 5: check expiry
  if (now > record.expiresAt) {
    return { valid: false, reason: "expired" };
  }

  // Step 6: check minimum spend
  if (cartTotalPence < record.minimumSpendPence) {
    return { valid: false, reason: "below_minimum" };
  }

  // Step 8: calculate discount
  let discountPence: number;
  if (record.percentOff !== null) {
    discountPence = Math.floor((cartTotalPence * record.percentOff) / 100);
  } else {
    discountPence = record.amountOffPence!;
  }

  // Step 9: clamp
  const finalTotalPence = Math.max(0, cartTotalPence - discountPence);

  // Step 10: return
  return { valid: true, discountPence, finalTotalPence };
}

// -- redeemDiscountCode (AI version) -----------------------------------------

export function redeemDiscountCode(
  code: string,
  customerId: string,
  orderId: string
): void {
  const normalised = code.trim().toUpperCase();
  const record = codesDB.find((c) => c.code === normalised);
  if (!record) {
    throw new Error(`Discount code not found: ${code}`);
  }

  usagesDB.push({
    codeId: record.id,
    customerId,
    orderId,
    usedAt: new Date(),
  });
}

// -- 10-input test runner -----------------------------------------------------

export function runAllTests() {
  console.log("=== Part C: AI Implementation – 10-input comparison ===\n");

  // Same 5 as Part B
  console.log("T1:", JSON.stringify(validateDiscountCode("SAVE20", "cust-A", 5000, new Date("2026-06-01"))));
  console.log("T2:", JSON.stringify(validateDiscountCode("SAVE20", "cust-A", 500, new Date("2026-06-01"))));
  redeemDiscountCode("SAVE20", "cust-B", "order-prev");
  console.log("T3:", JSON.stringify(validateDiscountCode("SAVE20", "cust-B", 5000, new Date("2026-06-01"))));
  console.log("T4:", JSON.stringify(validateDiscountCode("SAVE20", "cust-A", 5000, new Date("2027-06-01"))));
  console.log("T5:", JSON.stringify(validateDiscountCode("BADCODE", "cust-A", 5000, new Date("2026-06-01"))));

  // 5 new inputs
  console.log("T6:", JSON.stringify(validateDiscountCode("TENOFF", "cust-A", 5000, new Date("2026-06-01"))));
  // Expected: {valid:true, discountPence:1000, finalTotalPence:4000} (fixed amount)

  console.log("T7:", JSON.stringify(validateDiscountCode("save20", "cust-A", 5000, new Date("2026-06-01"))));
  // Expected: valid (lowercase should be normalised)

  console.log("T8:", JSON.stringify(validateDiscountCode("SAVE20", "cust-A", 1000, new Date("2026-06-01"))));
  // Expected: {valid:true} – exactly at minimum spend (edge case)

  console.log("T9:", JSON.stringify(validateDiscountCode("SAVE20", "cust-A", 999, new Date("2026-06-01"))));
  // Expected: {valid:false, reason:"below_minimum"} – 1 pence below minimum

  // T10: Already used AND expired – which reason comes back first?
  redeemDiscountCode("SAVE20", "cust-C", "order-old");
  console.log("T10:", JSON.stringify(validateDiscountCode("SAVE20", "cust-C", 5000, new Date("2027-06-01"))));
  // My impl: "expired" (expiry checked first)
  // AI impl: "already_used" (already_used checked first)
  // --> This is the disagreement – see difference-table.md
}

runAllTests();
