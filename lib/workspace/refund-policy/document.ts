export const REFUND_POLICY_DOCUMENT = {
  "version": "workspace_refund_policy_2026_01",
  "effectiveAt": "2026-10-12T09:28:09.000Z",
  "title": "AirBharath Workspace Refund Policy",
  "sections": [
    {
      "title": "Who this policy covers",
      "paragraphs": [
        "This policy applies to paid AirBharath Workspace memberships provided by Eresha Technology Innovators Pvt. Ltd., operating the AirBharath brand, at West Patel Nagar, New Delhi 110008, India. Contact academy@airbharath.in for support.",
        "This policy is separate from the Creator Terms. Both current agreements must be explicitly accepted before a new membership purchase."
      ]
    },
    {
      "title": "Your 72-hour request window",
      "paragraphs": [
        "You may request a full refund within exactly 72 elapsed hours of the authoritative successful-payment time recorded for your Workspace order. The deadline is that payment time plus 72 hours. A request recorded by our server at or before the displayed deadline is timely. Browser time does not decide eligibility.",
        "Order creation, browser confirmation, Early Access, membership start and the 9 November 2026 launch date do not start or extend this window. If payment timing has not been authoritatively established, contact support rather than assuming a refund deadline.",
        "Submitting a timely request preserves it for later AirBharath review, even when the review occurs after the 72-hour deadline."
      ]
    },
    {
      "title": "Request and review",
      "paragraphs": [
        "Use Request refund in your authenticated Workspace membership area. Choose a reason; additional details are optional. Do not supply card, bank account or UPI details. There is one self-service refund case per order.",
        "AirBharath reviews requests and may approve or reject them under this policy, the Creator Terms and applicable law. Rejection includes a recorded reason and ends that self-service case. You may contact support separately; an exception is not promised.",
        "A flag, suspension or allegation of materially false information does not automatically deny an otherwise timely request. Relevant facts require a deliberate review and decision."
      ]
    },
    {
      "title": "Full amount and original payment method",
      "paragraphs": [
        "V1 supports a full refund only: the entire captured Workspace order total actually paid after coupon discounts and GST. There are no partial, percentage, custom-amount, downgrade, wallet-credit or Workspace-credit refunds under this policy.",
        "No AirBharath administration fee, processing fee or Razorpay merchant fee is deducted from your refundable amount. Merchant processing charges borne by AirBharath are separate.",
        "Approved refunds are initiated against the original captured payment through its payment provider and returned through the original payment method. We do not collect alternative payout details. Arrival may take additional provider and bank processing time; we do not guarantee a particular bank-credit date."
      ]
    },
    {
      "title": "Approval, processing and completed refunds",
      "paragraphs": [
        "Approval leads to provider refund initiation; approval and initiation do not mean a refund has completed or that money has reached your bank. A processing problem may require reconciliation and review.",
        "Your membership remains usable while a request is pending, approved, processing or uncertain, unless an independent account restriction applies. Rejection does not change the paid term.",
        "Only authoritative provider confirmation of the full refund ends the paid Workspace entitlement from the affected membership. Your creator profile, private drafts, review history and builder content are retained for historical/read access under the existing access rules. Paid editing requires a new paid entitlement; refund does not authorize publication."
      ]
    },
    {
      "title": "Coupons and policy history",
      "paragraphs": [
        "A refund does not restore coupon usage capacity or reverse historical redemption. The same user cannot reuse a consumed coupon merely because the order was refunded. Order and coupon attribution remain recorded.",
        "Future contractual changes require a new policy version and new acceptance for new purchases. Existing order snapshots and paid memberships are not invalidated simply because later policy wording changes."
      ]
    },
    {
      "title": "Applicable law and contact",
      "paragraphs": [
        "This policy operates subject to applicable Indian law and does not remove mandatory legal rights. Disputes may be brought before courts of competent jurisdiction in New Delhi, India, consistently with the Creator Terms. Contact academy@airbharath.in for questions."
      ]
    }
  ]
} as const;
export const REFUND_POLICY_CANONICAL_CONTENT = JSON.stringify(REFUND_POLICY_DOCUMENT);
export const CURRENT_REFUND_POLICY = { version: REFUND_POLICY_DOCUMENT.version, contentHash: "1f78a51d0488154e271d9f36ed1953e1c8db71e2679f71404020c54bb78a4637", effectiveAt: REFUND_POLICY_DOCUMENT.effectiveAt } as const;
export type RefundPolicyIdentity = { version: string; contentHash: string; effectiveAt: string };
export const refundPolicyHref = () => `/workspace/refund-policy?version=${CURRENT_REFUND_POLICY.version}`;
export const REFUND_POLICY_CATALOGUE = {
  [REFUND_POLICY_DOCUMENT.version]: { identity: CURRENT_REFUND_POLICY, document: REFUND_POLICY_DOCUMENT, canonicalContent: REFUND_POLICY_CANONICAL_CONTENT },
} as const;
