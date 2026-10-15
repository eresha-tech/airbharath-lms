# Creator activation settings and UX corrections

**CREATOR ACTIVATION SETTINGS & UX VERIFIED LOCALLY** — 15 October 2026.

Branch: `codex/workspace-1.8-launch`. Clean starting HEAD: `c64d881`. Verified implementation commit: `0fb2436`; the report commit is returned separately to the owner.

## Eligibility and prospective transition

- Published local settings **version 10** through the normal validated Admin HTTP workflow, using an existing persisted synthetic Admin. Explicit owner authorization was obtained for this exact publication. One immutable publication audit records the change.
- Minimum experience: **12 completed months**. Deterministic evaluator tests reject 11 months and accept 12 and 13. Required professional information and declarations remain unchanged.
- New approval validity: **86,400,000 milliseconds / 24 elapsed hours**, measured from the stored server decision timestamp. Rejection cooldown remains **seven days**; every other setting is unchanged.
- The preceding version used 24 months / 30 days. Existing approvals retain their original `eligibleUntil`; no unpaid approval was shortened. New and renewed checks use the new version. Existing accepted orders retain idempotent recovery, pricing and eligibility snapshots; paid memberships and Creator/course history are unaffected.
- Existing authoritative quote/order services recheck eligibility when accepting a new order. Tests cover expiry at the exact boundary, renewal and accepted-order recovery. The activation UI displays the stored deadline, blocks new checkout when it expires and links to a fresh eligibility check. Reloading never extends approval.
- Source defaults now match the approved policy. No migration SQL, schema or migration journal changed. Other environments require their own authorized prospective settings publication; changing a source default does not overwrite a published database policy.

## Coupon and navigation corrections

Before: a rejected coupon cleared the price quote and blocked payment until the user removed the code. This symptom was reproduced using the previous component in an isolated browser harness.

After: recognized invalid/expired/exhausted/inapplicable coupon responses produce an inline error and a **fresh authoritative standard quote**, preserving the selected plan and entered text. Effective coupon/discount are cleared; contact and independent legal prerequisites still apply. Availability, network and eligibility failures continue to block checkout. Rapid edits abort stale responses.

Standard GST-inclusive totals remain **₹5,899 / ₹9,999 / ₹17,699**. Valid coupon economics and server capacity/freshness checks are unchanged. Checkout consumes the displayed server quote/hash, never the input text. A definitive coupon/quote rejection before order acceptance refreshes the amount and requires another click; uncertain failures and accepted-order recovery retain their idempotency data.

The top **Activate Membership** button only focuses and scrolls to the existing checkout region. It provides sticky-header clearance, keyboard access and immediate scrolling for reduced-motion preferences. It opens no modal and starts no payment. Existing lavender styling and homepage/Masterclass hero are unchanged.

## Verification and preservation

- Real PostgreSQL: TCP and `/tmp` socket agree on `airbharath_lms`, port 5433, OID `16384`, system identifier `7680462735222304705`; development classification. **32 migrations, 0000–0031**, match source hashes/timestamps.
- Fresh preservation baseline: **7,766 original rows across 62 tables** retained, except the approved preceding settings row's `is_current` transition. Original financial, legal, eligibility and course history remains intact.
- Real database services verified the published 12-month policy, exact 24-hour deadline, validity immediately before expiry, rejection at expiry, renewal and seven-day cooldown. Tagged temporary fixture writes were rolled back normally; no history was deleted or triggers weakened.
- Real hydrated Chrome: actual local invalid-coupon response restored ₹5,899 and zero discount without clearing text; desktop keyboard CTA, 390×844 mobile layout, sticky clearance, reduced motion and controlled-clock expiry/renewal message passed. Screenshots were inspected; no page errors occurred.
- Isolated actual-component browser tests with **mocked** Checkout/legal/provider responses covered invalid, expired, exhausted and wrong-plan coupons, replacement by a valid coupon, stale response cancellation, exact displayed amount/hash sent to checkout, and coupon expiry at acceptance requiring a refreshed price and second click. These were not genuine payment operations.
- Final `pnpm validate`: **1,356 Vitest tests across 113 files, 43 Node checks, TypeScript and lint passed**. Isolated payment-disabled production build passed with dummy unreachable DB credentials, no provider credentials and cached original fonts. `git diff --check` and migration/schema no-drift checks passed.
- Initial check attempts hit native sandbox/temporary-storage restrictions. After moving this task's scratch artifacts, the full run identified one historical-default hash assertion; it was corrected to check the unchanged migration's original defaults. Final checks passed. No dependency changes were needed.

The local app is running at `http://localhost:3000` with guarded demo phone OTP only. Checkout, Test authorization, webhook intake, payment/refund reconciliation, refunds, email/notices and Live authorization are **OFF**. No genuine Razorpay operation, production access, migration or deployment occurred. Runtime flags were not persisted. Only this task's generated build/cache directories were removed; inspected screenshots remain in `/tmp/activation-ux-screenshots`.

## Files changed

- `lib/workspace/eligibility/model.ts`
- `lib/workspace/membership/preview.ts` (new)
- `app/(user)/workspace/activate/page.tsx`
- `components/workspace/ActivationPreview.tsx`
- `components/workspace/MembershipCheckout.tsx`
- `tests/routes/workspace-activation-preview.test.ts` (new)
- `tests/routes/workspace-eligibility-fixtures.ts`
- `tests/routes/workspace-eligibility-migration.test.ts`
- `tests/routes/workspace-eligibility-model.test.ts`
- `tests/routes/workspace-eligibility-service.test.ts`
- `tests/routes/workspace-payments-service.test.ts`
- This report.

No remaining blocker for this local scope. Production release gates and any further genuine provider testing remain separately authorized work. Stop here.
