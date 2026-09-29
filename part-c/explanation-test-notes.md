# Part C - The Explanation Test (Step C4)

## Instructions for recording

Record a short video (max 5 minutes) explaining the AI-generated implementation
(`part-c/ai-implementation.ts`) to an imaginary colleague.

**Rules for the recording:**
- No code on screen
- Use only the pseudocode in `part-b/pseudocode.md` as your notes
- Walk through:
  1. What the feature does overall
  2. Where it can fail (all 4 failure reasons)
  3. What happens at each failure

---

## Script / talking points (use these as a guide)

**Opening:**
"So this is the discount code validator. When a customer applies a discount code at checkout,
this function decides whether the code is valid and, if so, how much to take off."

**What it does:**
"It takes four things: the code they typed, their customer ID, how much is in their cart,
and the current time. It returns either a success with the discount amount, or a failure
with a reason."

**The four failure reasons - in order:**
1. "If the code doesn't exist at all in our system - not found."
2. "If the code exists but today is past its expiry date - expired."
3. "If the cart total is below the code's minimum spend - below minimum."
4. "If this particular customer has already used this code - already used."

**If it passes all checks:**
"We calculate the discount. If it's a percentage code, we multiply the cart total
by the percentage and take the floor - no fractional pence ever leaves our system.
If it's a fixed amount, we just use that amount directly.
Then we subtract the discount from the cart total, clamp it at zero so it never
goes negative, and return both the discount amount and the new total."

**Where it can fail unexpectedly:**
"There's one edge case worth knowing: if a customer has already used a code AND
the code is also expired, the order the AI checks these things gives back 'already used'
not 'expired'. That might or might not be what you want - we've documented it in
the difference table and it needs a product decision."

The last point is the one to spend the most time on. It is the only part of this feature
where I cannot tell you the correct answer from the code alone, and saying so out loud is
more useful to a colleague than presenting either order as obviously right.

---

## Non-technical listener notes

**What they said back:**
"It explains how a shop checks a discount code to see if a customer can use it and how much money they will save. The system checks if the code is still valid and hasn't been used before. If everything is okay, it works out the discount and the new amount to pay."

**verdict:** partially. The pseudocode and explanation were clear to an extent for a non-technical
person to understand the feature and the end goal. However, she was unable to pick up edge cases.

---

## Recording file

Save your recording as: `part-c/explanation-recording.mp4`
(Record yourself speaking through the script above, camera optional, screen optional)
