# Phase 2.2P — final payout UI/UX review

Review date: 6 November 2026. Branch: `feat/creator-workspace`. Reviewed implementation: `75c8ffe`. This focused review improves the existing finance experience; it does not change the payout provider, settlement policy, financial authorization or payment execution model. Founder acceptance remains pending.

## Findings and corrections

| Location | Demonstrated issue | Correction |
| --- | --- | --- |
| `lib/creator-payments/presentation.ts:53` | Creator details exposed queues, funding and reconciliation instructions. A funding delay could sound like a bank-account problem. | One shared Creator presentation maps the authoritative state to a plain label, explanation and next action. Low funding explicitly belongs to AirBharath and does not require changing bank details. |
| `components/workspace/finance/Shared.tsx:90` | Creator details displayed provider IDs and operational verification evidence ahead of useful next steps. | Amount, masked bank, approval, confirmed payment/return dates and available UTR remain visible. A “What happens next” panel explains whether the Creator needs to act. Exact provider evidence remains in expandable Admin details. |
| `app/(workspace)/workspace/(creator)/earnings/page.tsx:8` | Overview used “dispute sweep” and “reconciliation”, including confusing checks on an empty account. | Plain monthly-payment explanation, two-Admin approval, conditional earnings checks and a clear payout-account link. No guaranteed arrival date. |
| `components/workspace/finance/Shared.tsx:29` | Reserved, processing and paid language required financial knowledge. | Creator cards now say Available for payment, Pending earnings, Payments in progress and Paid to date, with explanations. Admin keeps operational labels. Monetary calculations are unchanged. |
| `components/workspace/finance/Shared.tsx:53` | Raw purchase references were prominent and missing fees made a provisional net look final. | Creator order references move into the earnings breakdown. Unknown fees and provisional earnings explicitly say they are being checked. Unknown fees are not rendered as zero. |
| `lib/creator-payments/presentation.ts:114` | Pending, rejected and verified bank badges did not explain the next step. | Pending: wait without resubmitting. Rejected: check legal name/account/IFSC and save corrections or contact support. Verified: no action unless details changed. Setup is explicitly separate from publishing. |
| `components/workspace/finance/BankAccountForm.tsx:44` | Initial setup called itself an account “change”; security wording appeared to require another login for everyone. Save feedback was inserted only after completion. | Initial/change confirmation titles differ. Phone verification instructions apply when requested; the existing ten-minute server guard remains. Persistent polite status announcements, error focus and busy dialog state improve feedback. |
| `components/workspace/finance/AdminAction.tsx:12` | Generic confirmation and “Review approve payout” buttons blurred approval versus execution. | Action-specific review/confirm labels and descriptions: Approve monthly amount reserves money; Authorize transfer permits automatic execution; neither claims Paid. |
| `app/(admin)/admin/creator-settlements/payees/[id]/page.tsx:17` | A verified account defaulted to Reject verification, and a generic unavailable message hid the relevant blocker. | Audited bank access is the safe default for a verified account. A specific explanation identifies bank verification, missing payment evidence, no eligible amount, configuration or launch-flag prerequisites. |
| `app/(admin)/admin/creator-settlements/payouts/[id]/page.tsx:16` | Closed failed/cancelled provider operations offered a reconciliation action that could not recover that operation. | Closed operations lead to reviewing current balance and bank details before a separately approved new payment. Exact failure/reversal evidence remains available. Active uncertain operations keep tracing/reconciliation. |
| `lib/creator-payments/reporting.ts:147` | Old cancelled/terminal errors remained in the actionable exception list and count. | Both count and list now restrict payout exceptions to active approved/initiated/uncertain operations. Terminal history remains accessible. |
| `components/workspace/finance/Shared.tsx:78` | Creator history filters used internal state names; the select’s accessible name also included all option text. | “Payments not yet paid” groups approved/initiated/uncertain states; Paid, Failed or returned, Cancelled remain distinct. The status select has an explicit accessible label. |

The existing lavender theme, typography classes, navigation shell, cards, status colors, responsive layouts, dialog library, amount formatting and finance authorization were retained. Existing clear screens and backend modules were left alone. The accessibility review used the [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).

## Creator journey and acceptance checklist

Use synthetic identities and bank details only in the isolated local fixture.

1. Open **Workspace → Earnings & Payouts** with no sales and no account. Expect zero balances, a useful empty state and **Set up payout account**. Course publication does not require payout setup.
2. Make a synthetic course purchase. Pending earnings appear; current-month earnings are not immediately available for a previous-month settlement. If gateway fee evidence is missing, expect **Earnings being checked** / **Fee being checked**, rather than an assumed zero fee or final net.
3. Open **Settings → Payout account** from Earnings. Enter matching account numbers and IFSC, review the monthly policy and confirm the masked destination. A recent phone verification is required only when the existing security guard requests it. A mismatch focuses an announced error; saving announces success.
4. Pending verification explains that no repeat submission is needed. Rejection explains correction/support. Corrected details create a new version. Verification explains that no further Creator action is needed unless the details change.
5. Previous-month eligible earnings undergo monthly review. Two independent Admin decisions precede the bank transfer. **Payment being prepared** is not Paid. **Awaiting payment approval** explicitly says AirBharath handles the approval.
6. **Transfer in progress** is not Paid. **Payment delayed** caused by funding tells the Creator not to change bank details. **We’re checking your payment** explains uncertainty without requiring knowledge of provider operations.
7. **Paid** appears only from the existing authoritative confirmation. Check its confirmation date and UTR when available. Contact support if the bank statement does not show the payment; the UI does not guarantee receipt or an arrival date.
8. **Payment failed** and **Payment returned** explain review of any amount still owed. Review saved bank details only if incorrect. Returned payments retain their earlier confirmation date and stop contributing to Paid to date. A monthly statement covers sales/adjustments and can differ from a particular payout.
9. With membership expired, check retained earnings, history, CSV and payout-account navigation. Existing course-editing restrictions remain; valid settlement obligations continue.

Creator statuses follow the same authoritative records in overview/history/details. AirBharath sales commission remains **0%**; course tax, actual evidenced gateway fees, refunds/disputes and corrections remain disclosed. Gateway fee tax is counted once. RazorpayX payout fee evidence remains a separate business-funding concern under the existing policy.

## Admin journey and acceptance checklist

1. Open **Admin → Creator Settlements**. Use Payout approvals, Bank transfers, Payee verification, Exceptions & reconciliation and Completed & audit. Counts describe actionable operations, not a reason to erase closed history.
2. Verify bank ownership/legal name against independent evidence. Ordinary views stay masked. Audited bank reveal requires a reason and hides the details after the existing timeout.
3. Review the Creator’s previous-month eligible balance and payment evidence. Choose **Review payout approval → Approve monthly amount**. Confirm the exact amount and bank destination. This reserves the amount; it does not send it.
4. A different Admin opens the payout and chooses **Review transfer authorization → Authorize transfer**. The original approver cannot authorize it. The worker initiates the existing RazorpayX operation automatically.
5. Open **RazorpayX details & recovery evidence** for exact status, provider ID, last error/reason, last independent check and fee/tax evidence. Unknown provider fees remain **Not yet known**. Do not confuse gateway merchant settlement with funding the separate RazorpayX payout account.
6. For low funds, fund the approved RazorpayX account and track the existing payout. For provider pending, resolve its provider approval workflow. For uncertain results, use the existing trace/reconciliation operation. Do not create a parallel payout or manually mark Paid.
7. For an authoritative terminal failure/return, review the current Creator balance and bank details through the recovery link. Correct/verify a new bank version when necessary. Any replacement needs a fresh approval and independent authorization. Historical operations are retained.

## Actual verification

All database and payment activity used a new disposable PostgreSQL cluster, private Unix socket, synthetic users/bank accounts and intercepted provider transport. Ambient `.env` files and private credentials were excluded. Test startup asserted the exact fixture path/data directory and synthetic transport. The separate founder testing server on port 3024 was not modified by this review.

| Check | Result |
| --- | --- |
| Prior saved screenshots | All 36 relevant Phase 2.2P screenshots inspected, including mobile and prior tablet evidence |
| Actual baseline pages | 21 Creator/Admin states captured at desktop and mobile before editing |
| Focused route/presentation/component/provider tests | 50 passed across four files |
| `pnpm validate` | 55 Node tests, 1,763 Vitest tests across 145 files, strict TypeScript and lint passed |
| Production build | Optimized Next.js build passed; 78 static pages generated |
| Fresh isolated PostgreSQL foundation | 48 groups passed: migrations/repeat upgrade, concurrent reservation/worker claims, ledger/entitlement exactly once, refunds/disputes, bank-version binding, signed inbox, lost responses, reversals and expiry guards |
| Actual payout browser suite | Nine groups passed: bank verification, two-Admin authorization, low funding, processing/Paid, signed duplicate reversal webhook, lost-response recovery without a duplicate transfer, failed payout/manual Paid forgery rejection, Creator/Admin queues and mobile layout |
| Actual first-time/recovery browser suite | Nine groups passed: zero sales/account, real synthetic first sale before bank setup, missing/recovered fee evidence, bank mismatch/save/keyboard feedback, rejection/correction/verification, provider pending, grouped history/balance query checks, terminal recovery, stale-auth error and expiry finance access |
| Responsive / keyboard | 1440px desktop, 820px tablet and 390px mobile; no page horizontal overflow in captured journeys; dialog Tab containment, Escape/focus return, focused errors and persistent polite status feedback checked |
| Contrast / preferences | Paid and returned financial-card text/badges checked at 390px in light and forced existing dark CSS with reduced-motion preference. Every sampled text contrast ratio was at least 4.5:1. This is a focused check, not whole-site accessibility certification. |
| Preservation | Six protected modifications unchanged byte-for-byte from review start; 81 historical Drizzle SQL/metadata files and lockfile unchanged. No backend execution, ledger, authorization, schema or migration change. |

The PostgreSQL foundation ran on the pre-edit source. Subsequent browser journeys used the revised UI and read-model queries, including independent SQL totals for reserved/paid amounts and active-only exception results. No migration or monetary aggregation was changed by the review.

One final validation attempt inside the restricted process sandbox could not create child-process stream descriptors; it passed when rerun in the permitted local execution context. A build attempt correctly rejected an incompatible `NODE_ENV=production` / `DATABASE_ENV=test` combination; the final credential-free build used the required production classification with an unreachable loopback database placeholder. These were verification-environment corrections; no production target was used. Preliminary browser harness failures were corrected for navigation timing, canonical fee re-verification and the demonstrated status-label issue before the final successful run.

## Evidence and screenshots

Local artifacts are in `output/audits/workspace-phase22p-uiux/`. They contain synthetic fixture information, not live bank/provider evidence. Full-resolution before/after screenshots and machine-readable results are linked from that directory’s `REPORT.md`.

- `before-pages.json`: all inspected baseline page text.
- `payout-browser.json` and `ux-browser.json`: final successful browser assertions.
- `visual-check.json`: sampled computed contrast ratios and theme/preference evidence.
- `audits/workspace-phase22p/postgres.json`: 48 PostgreSQL foundation groups.
- `focused.log`, `validate.log`, `build.log`: completed command results.
- `preservation.json`: changed-file/preservation manifest.

## Changed files

Only these review files belong in the local commit:

| File | Purpose |
| --- | --- |
| `app/(admin)/admin/creator-settlements/creators/[id]/page.tsx` | Retain Admin balance/ledger terminology through shared components |
| `app/(admin)/admin/creator-settlements/page.tsx` | Accurate bank/provider evidence description |
| `app/(admin)/admin/creator-settlements/payees/[id]/page.tsx` | Safe verified-bank default and specific approval blockers |
| `app/(admin)/admin/creator-settlements/payouts/[id]/page.tsx` | Two-Admin guidance and actionable closed-payout recovery |
| `app/(workspace)/workspace/(creator)/earnings/page.tsx` | Plain overview, monthly steps, fees and account setup |
| `app/(workspace)/workspace/(creator)/earnings/payouts/page.tsx` | Plain history introduction |
| `app/(workspace)/workspace/(creator)/earnings/payouts/[id]/page.tsx` | Plain details introduction |
| `app/(workspace)/workspace/(creator)/settings/payout-account/page.tsx` | Verification next steps, navigation and expiry explanation |
| `components/workspace/finance/AdminAction.tsx` | Specific confirmations, action feedback and accessibility |
| `components/workspace/finance/BankAccountForm.tsx` | First-save/change wording, security guidance and feedback |
| `components/workspace/finance/Shared.tsx` | Creator/Admin presentation, filters, details and balances |
| `lib/creator-payments/presentation.ts` | Truthful Creator status and bank guidance |
| `lib/creator-payments/reporting.ts` | Grouped pending filter and active-only payout exceptions |
| `tests/routes/creator-finance-presentation.test.ts` | Authoritative state/next-action regressions |
| `tests/routes/creator-finance-ux.test.ts` | Shared rendering, unknown evidence and balance regressions |
| `tests/postgres/phase22p-browser.cjs` | Updated actual payout browser acceptance |
| `tests/postgres/phase22p-ux-browser.cjs` | First-time Creator and recovery browser acceptance |
| `docs/creator-payouts-phase22p.md` | Link current acceptance wording and screenshots |
| `docs/creator-payouts-phase22p-ux-review.md` | This review and founder acceptance guide |

The protected pre-existing changes remain outside this commit: Admin workspace refund detail, access-grant detail, workspace reports, workspace Razorpay webhook, workspace Admin details service and `tests/setup.ts`. Existing unrelated untracked audit artifacts also remain untouched.

## Remaining requirements

Founder acceptance of this revised experience is still required. The existing local integration does not prove AirBharath’s live contact/fund-account creation permission, payout permission, funding availability, KYC/limits, stable-egress allowlisting, public signed webhook delivery, scheduler operation or actual bank credit. RazorpayX Dashboard activation alone is insufficient. Follow the existing protected activation/funding guide and separately authorize any controlled live pilot; no real transfer was performed in this review.

The local dev server could not fetch the Outfit font and used its configured fallback in some captures. The optimized build passed separately. Developer-only Next.js badges in some screenshots are local tooling; they are not payment statuses. Final installed-font appearance and public webhook/real-provider behavior remain acceptance items for an approved environment.

No production database operation, deployment, push, merge, public activation, storage billing or Phase 2.3 work was performed.
