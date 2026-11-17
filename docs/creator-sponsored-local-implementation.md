# Private sponsored Creator implementation — local verification only

Baseline: e015c261b1017a11be51ea7f8fe225f09872be54. Design reference: AB-SC-SIGNOFF-1.0.0. Public launch remains NO-GO.

## Activation boundary

Real offer issuance, acceptance and sponsored financial activation are unavailable. The review addendum is not registered as a canonical policy. Do not enable this feature for real Creators by setting an environment flag.

The only executable path requires a development/test runtime, DATABASE_ENV=test, CREATOR_SPONSORSHIP_SYNTHETIC=true, the existing independent RazorpayX Test scope proof and actual database-identity verification, plus an immutable, expiring commercial rollout record matching that owned loopback database. Production and hosted runtimes fail closed. Migration 0046 permits only test-scoped commercial evidence. No provider split or new payout integration exists.

## Implemented local flows

The existing private Admin access-grant screen has fixed 0% and 80/20 offers, 3/6/12-month terms and a separate second Admin approval. Sealed offers expire exactly 14 elapsed days after approval. The Creator membership page shows private offers, an unchecked acknowledgment, acceptance/rejection and history. Acceptance and the existing complimentary grant commit atomically. Conflicting paid or complimentary time is rejected rather than shortened.

Editing entitlement and the commercial agreement are independent. Expiry alone never changes the commercial share. Verified paid fulfillment records a permanent prospective 0% replacement; subsequent expiry or refund does not undo that event. An explicit accepted, independently approved 0% replacement preserves remaining grant time. Material 80/20-to-80/20 replacement is not implemented; withdraw an unaccepted offer and issue a newly approved one. Replacing an already accepted agreement with another 80/20 agreement remains unavailable.

Commercial checkout quotes freeze for 15 minutes before provider-order creation. The saved order binds learner/course/Creator, scope, quote, agreement, effective event, legal hash and calculation version. Existing pending orders retain their frozen terms. Legacy orders/grants are not backfilled.

Synthetic financial facts retain actual fee evidence separately from missing evidence. Cumulative integer-paise targets use positive half-up 20% allocation and the Creator residual. Immutable AirBharath allocation revisions pair atomically with Creator ledger deltas. Full refunds reverse commission; disputed/refunded overlap awaits review. These calculations do not establish a live tax, invoicing or loss model.

Creators can use existing private support to request stopping new sales without renewal. Authorized Admins use the existing unpublish control, retain the request/action audit trail and preserve valid learner access. Support does not itself change publication or commercial history.

## Financial portion deliberately stopped

The current aggregate settlement balance cannot establish which historical payout discharged which purchase or legally distinguish recoverable sponsored debt from future earnings. Automatically netting negative sponsored balances would presume unapproved offset rights.

Therefore new payout reservations and first dispatch are blocked for a Creator with any frozen 80/20 order. Sponsored earnings are shown as review/pending and unavailable for settlement. Existing in-flight payout reconciliation remains available. Ordinary 0% Creators retain their existing payout behavior. This is a safety stop, not a completed sponsored settlement implementation.

Before financial activation, obtain the signed accountant/legal schedule for seller/collector, invoicing/GST, TCS/withholding, refund/chargeback taxes, retained gateway fees, negative balances and permissible recovery. Separately approve the exact receivable/settlement-source attribution and permitted recovery model; implement and test it without automatic bank debit or unauthorized future-earnings offsets. Do not release these guards merely by changing a flag.

## Migration and verification

0046 adds immutable commercial offers/events/quotes/rollout evidence and a separate commission ledger, nullable order/allocation references and fail-closed triggers. It changes no historical migration, enrollment or financial evidence. Apply only to an explicitly owned disposable synthetic database during this phase.

Focused tests are `tests/routes/creator-sponsorship*.test.ts`, existing payout/FAV/isolation tests and `tests/postgres/creator-sponsorship*.cjs`. PostgreSQL modules consume the existing isolated multi-connection fixture, with injected provider transport. They are not commands for production databases. The local audit packet records the launcher, independently verified database identity, network restrictions, complete migration chain, real-browser evidence and exact results.

Keep Academy prospective-policy activation OFF. No deployment, production migration, live FAV, actual provider payout or public feature activation is authorized.
