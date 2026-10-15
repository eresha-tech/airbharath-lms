import { CREATOR_TERMS_DOCUMENT as V1_DOCUMENT, CREATOR_TERMS_CANONICAL_CONTENT as V1_CANONICAL, CURRENT_CREATOR_TERMS as V1_IDENTITY } from './v1';
import type { CreatorTermsIdentity } from './v1';
export type { CreatorTermsIdentity } from './v1';

// V1 is preserved byte-for-byte in v1.ts. Contractual edits require another version.
export const CREATOR_TERMS_DOCUMENT = {
  "version": "workspace_creator_terms_2026_02",
  "effectiveAt": "2026-10-12T06:51:32.000Z",
  "title": "AirBharath Workspace Creator Terms",
  "sections": [
    {
      "title": "Parties and scope",
      "paragraphs": [
        "AirBharath is a brand operated by Eresha Technology Innovators Pvt. Ltd. This agreement is between the eligible Workspace creator/user and Eresha Technology Innovators Pvt. Ltd., operating the AirBharath brand, at West Patel Nagar, New Delhi 110008, India. These Creator Terms concern AirBharath Workspace, a creator platform for aviation professionals, and are separate from learner course-purchase terms.",
        "Membership provides access to available Workspace creator tools according to the selected prepaid plan and current product capabilities. It does not promise every planned feature."
      ]
    },
    {
      "title": "Age, capacity and eligibility",
      "paragraphs": [
        "I confirm that I am 18 years of age or older and legally able to enter into the AirBharath Workspace Creator agreement. No date of birth is collected for this declaration.",
        "Workspace Eligibility is based on information supplied by the applicant. It is not identity verification, DGCA approval, regulatory approval, airline approval or government approval. It is separate from course approval and may be revisited if information is materially inaccurate.",
        "You must provide truthful and materially accurate professional background, experience, professional profile, course and account information."
      ]
    },
    {
      "title": "Your audience and commercial expectations",
      "paragraphs": [
        "Creators are expected to promote their courses to their own audience and professional network when public course offerings become available. AirBharath does not guarantee learners, traffic, enrollments, income, sales or marketplace distribution, and does not undertake to supply customers.",
        "Membership does not guarantee creator revenue, employment, airline placement or any business outcome."
      ]
    },
    {
      "title": "Current tools and course review",
      "paragraphs": [
        "The current Workspace supports the Creator Dashboard, Creator Profile, private Course Draft, AirBharath Review, Changes Requested and Resubmission, Review Approval, and a Private Course Builder with modules, lessons and text lesson content. Video uploads, downloadable resources, assessments, public publication, public course sales and learner access to creator courses are future functionality and are not currently available features.",
        "Every course requires AirBharath review before publication. AirBharath Course Review Approved means the approved proposal/course version may proceed into the private Course Builder. It is not final publication authorization. Review approval and builder access do not automatically publish a course; final content/publication approval will be a separate process.",
        "AirBharath course review does not mean DGCA, airline, government, defence or regulator approval, or certification unless separately documented. You must not make false approval or affiliation claims."
      ]
    },
    {
      "title": "Content ownership and limited service permission",
      "paragraphs": [
        "Creators retain ownership of original content they create and have the right to submit. Uploading or submitting third-party material does not make it your property or transfer ownership to AirBharath.",
        "You grant AirBharath only limited permission reasonably necessary to host, store, process, privately display, review, technically deliver and operate your content within the applicable Workspace agreement, including private course-building infrastructure. This permission does not transfer ownership or automatically authorize public publication or sale. Delivery to learners after separate future publication approval must be governed by the then-current applicable terms.",
        "Future public selling or publication functionality may require additional or updated contractual terms. The learner Terms of Service description of content belonging to AirBharath or its licensors does not transfer creator ownership under these Creator Terms. No perpetual commercial publishing licence is granted here.",
        "You must have the rights and permissions required to use any images, text, manuals, diagrams, employer materials, trademarks or other copyrighted, confidential or proprietary content you submit. Do not submit infringing or illegal content or deceptive professional claims.",
        "Do not upload or disclose airline internal manuals, defence information, employer confidential information or operational/security-sensitive materials without authority to disclose and use them. This obligation concerns information you are not authorized to disclose; it does not treat all aviation knowledge as confidential."
      ]
    },
    {
      "title": "Professional responsibility",
      "paragraphs": [
        "Creator content is educational. You remain responsible for professional accuracy within your claimed expertise. Do not represent Workspace or your content as replacing legally required aviation training, regulatory certification, employer training, operational manuals or approved procedures unless explicitly documented for a particular course later."
      ]
    },
    {
      "title": "Prepaid membership and Early Access",
      "paragraphs": [
        "Quarterly membership lasts 3 calendar months, Half-Yearly 6 calendar months and Yearly 12 calendar months. Membership is prepaid with manual renewal; it is not recurring billing or autopay.",
        "Official paid-term launch is 9 November 2026, 00:00 Asia/Kolkata. After a successful payment before launch, eligible creators may receive Basic Workspace Early Access immediately. The purchased paid term begins at that launch time; Early Access does not extend the purchased paid term.",
        "For successful payments on or after launch, the paid term begins according to the existing successful-payment membership rules. Activation may complete later without extending the purchased calendar-month term. Access depends on normal payment reconciliation and membership fulfillment.",
        "Applicable GST and taxes are charged as displayed during checkout. Refund eligibility and processing are governed by the AirBharath Workspace Refund Policy presented at checkout. That separate policy must be completed before public payments are enabled; these terms do not define detailed refund rules."
      ]
    },
    {
      "title": "Account security and restrictions",
      "paragraphs": [
        "You are responsible for reasonable security of your account and access credentials. Do not share access or misuse Workspace.",
        "AirBharath may proportionately restrict, suspend or terminate Workspace access for material false information, misuse, infringement, unlawful activity or serious policy violations. It will act in a commercially reasonable manner and provide notice and an opportunity to address the issue where appropriate, except where immediate restriction is necessary for safety, security or legal compliance. Refund effects remain subject to the separate Refund Policy and applicable law; restriction is not automatic refund forfeiture."
      ]
    },
    {
      "title": "Changes, acceptance and privacy",
      "paragraphs": [
        "AirBharath may improve or change Workspace functionality over time without promising unchanged features forever. These changes do not retroactively change the duration or price of an already purchased term.",
        "Contractual text changes require a new version. New purchases and future renewals require acceptance of the then-current terms. A later terms version does not by itself revoke an already active paid membership.",
        "AirBharath retains your account identifier, terms version, content hash and acceptance timestamp as agreement evidence. This is not marketing consent. The AirBharath Privacy Policy applies to personal information."
      ]
    },
    {
      "title": "Law, jurisdiction and contact",
      "paragraphs": [
        "This agreement is governed by the laws of India. Disputes are subject to courts of competent jurisdiction in New Delhi, India.",
        "The contracting entity is Eresha Technology Innovators Pvt. Ltd., operating the AirBharath brand. Legal/business address: West Patel Nagar, New Delhi 110008, India. Workspace contractual/support contact: academy@airbharath.in."
      ]
    }
  ]
} as const;

export const CREATOR_TERMS_CANONICAL_CONTENT = JSON.stringify(CREATOR_TERMS_DOCUMENT);
export const CURRENT_CREATOR_TERMS: CreatorTermsIdentity = {
  version: CREATOR_TERMS_DOCUMENT.version,
  effectiveAt: CREATOR_TERMS_DOCUMENT.effectiveAt,
  contentHash: '8e0c57baad0ebffb9223635c35f4ec9d490dbe9a3c3d1ee9100c70baa042fca8',
};

export const CREATOR_TERMS_CATALOGUE = {
  [V1_DOCUMENT.version]: { document: V1_DOCUMENT, canonicalContent: V1_CANONICAL, identity: V1_IDENTITY, historicalDraft: true },
  [CREATOR_TERMS_DOCUMENT.version]: { document: CREATOR_TERMS_DOCUMENT, canonicalContent: CREATOR_TERMS_CANONICAL_CONTENT, identity: CURRENT_CREATOR_TERMS, historicalDraft: false },
} as const;

export const creatorTermsHref = (version = CURRENT_CREATOR_TERMS.version) => `/workspace/creator-terms?version=${encodeURIComponent(version)}`;
