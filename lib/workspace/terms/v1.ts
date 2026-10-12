// Contractual text is immutable within a version. Add a new document/version for changes.
// JSON.stringify of this ordered document is the canonical UTF-8 hash input.
export const CREATOR_TERMS_DOCUMENT = {
  version: 'workspace_creator_terms_2026_01',
  effectiveAt: '2026-10-12T00:00:00.000Z',
  title: 'AirBharath Workspace Creator Terms',
  sections: [
    { title: 'Parties and scope', paragraphs: [
      'AirBharath is the product/brand of Eresha Technology Innovators Pvt. Ltd., identified in the existing AirBharath site footer. These Creator Terms concern AirBharath Workspace, a creator platform for aviation professionals. They are separate from learner course-purchase terms.',
      'Membership provides access to available Workspace creator tools according to the selected prepaid plan and current product capabilities. It does not promise every planned feature.',
    ] },
    { title: 'Age, capacity and eligibility', paragraphs: [
      'I confirm that I am 18 years of age or older and legally able to enter into the AirBharath Workspace Creator agreement. No date of birth is collected for this declaration.',
      'Workspace Eligibility is based on information supplied by the applicant. It is separate from course approval and regulatory approval, and may be revisited if information is materially inaccurate. Eligibility is not professional identity or qualification verification.',
      'You must provide truthful and materially accurate professional background, experience, professional profile, course and account information.',
    ] },
    { title: 'Your audience and commercial expectations', paragraphs: [
      'Creators are expected to promote their courses to their own audience and professional network when public course offerings become available. AirBharath does not guarantee learners, traffic, enrollments, income, sales or marketplace distribution, and does not undertake to supply customers.',
      'Membership does not guarantee creator revenue, employment, airline placement or any business outcome.',
    ] },
    { title: 'Current tools and course review', paragraphs: [
      'The current Workspace supports the Creator Dashboard, creator profile, private course drafts, AirBharath review and an approved-proposal Course Builder with modules, lessons and plain-text lesson content. Video uploads, downloadable resources, assessments, public course sales and publication are future functionality and are not currently available features.',
      'Every course requires AirBharath review before publication. AirBharath Course Review Approved means the approved proposal/course version may proceed into the private Course Builder. It is not final publication authorization. Review approval and builder access do not automatically publish a course; final content/publication approval will be a separate process.',
      'AirBharath course review does not mean DGCA, airline, government, defence or regulator approval, or certification unless separately documented. You must not make false approval or affiliation claims.',
    ] },
    { title: 'Content ownership and limited service permission', paragraphs: [
      'You retain ownership of content you legitimately own. You grant AirBharath only the limited permission necessary to store, process, display privately, review and operate your content within the current private Workspace service. This permission does not transfer ownership or authorize commercial public publication or sale.',
      'Future public publication or selling may require an additional agreement or updated Creator Terms. The learner Terms of Service description of content belonging to AirBharath or its licensors does not transfer your ownership under these Creator Terms.',
      'You are responsible for having the rights and permissions required for content you submit. Do not submit infringing or illegal content, confidential information without authority, or deceptive professional claims.',
    ] },
    { title: 'Professional responsibility', paragraphs: [
      'Creator content is educational. You remain responsible for professional accuracy within your claimed expertise. Do not represent Workspace or your content as replacing legally required aviation training, regulatory certification, employer training, operational manuals or approved procedures unless explicitly documented for a particular course later.',
    ] },
    { title: 'Prepaid membership and Early Access', paragraphs: [
      'Quarterly membership lasts 3 calendar months, Half-Yearly 6 calendar months and Yearly 12 calendar months. Membership is prepaid with manual renewal; it is not recurring billing or autopay.',
      'Official paid-term launch is 9 November 2026, 00:00 Asia/Kolkata. After a successful payment before launch, eligible creators may receive Basic Workspace Early Access immediately. The purchased paid term begins at that launch time; Early Access does not extend the purchased paid term.',
      'For successful payments on or after launch, the paid term begins according to the existing successful-payment membership rules. Activation may complete later without extending the purchased calendar-month term. Access depends on normal payment reconciliation and membership fulfillment.',
      'Applicable GST and taxes are charged as displayed during checkout. Refund eligibility and processing are governed by the AirBharath Workspace Refund Policy presented at checkout. That separate policy must be completed before public payments are enabled; these terms do not define detailed refund rules.',
    ] },
    { title: 'Account security and restrictions', paragraphs: [
      'You are responsible for reasonable security of your account and access credentials. Do not share access or misuse Workspace.',
      'AirBharath may proportionately restrict, suspend or terminate Workspace access for material false information, misuse, infringement, unlawful activity or serious policy violations. It will act in a commercially reasonable manner and provide notice and an opportunity to address the issue where appropriate, except where immediate restriction is necessary for safety, security or legal compliance. Refund effects remain subject to the separate Refund Policy and applicable law; restriction is not automatic refund forfeiture.',
    ] },
    { title: 'Changes, acceptance and privacy', paragraphs: [
      'AirBharath may improve or change Workspace functionality over time without promising unchanged features forever. These changes do not retroactively change the duration or price of an already purchased term.',
      'Contractual text changes require a new version. New purchases and future renewals require acceptance of the then-current terms. A later terms version does not by itself revoke an already active paid membership.',
      'AirBharath retains your account identifier, terms version, content hash and acceptance timestamp as agreement evidence. This is not marketing consent. The AirBharath Privacy Policy applies to personal information.',
    ] },
    { title: 'Law, contact and legal confirmation', paragraphs: [
      'These Creator Terms are governed by the laws of India, consistent with the existing Terms of Service. Contact: academy@airbharath.in. The existing site contact address is Eresha Technology Innovators Pvt. Ltd., West Patel Nagar, New Delhi 110008; it is not identified here as a registered office.',
      'IMPLEMENTATION PLACEHOLDER — owner/legal confirmation is required for the complete registered/business address and any applicable court/forum jurisdiction before commercial launch. No court, grievance officer or company registration detail is inferred. This version is a draft awaiting owner/legal approval.',
    ] },
  ],
} as const;

export type CreatorTermsIdentity = { version: string; contentHash: string; effectiveAt: string };
export const CREATOR_TERMS_CANONICAL_CONTENT = JSON.stringify(CREATOR_TERMS_DOCUMENT);
// Frozen hash is generated once and pinned by runtime validation, tests and the migration.
export const CURRENT_CREATOR_TERMS: CreatorTermsIdentity = {
  version: CREATOR_TERMS_DOCUMENT.version,
  effectiveAt: CREATOR_TERMS_DOCUMENT.effectiveAt,
  contentHash: '7263f236cc1b27df8f95ef69a2dcc706981ec2060d58758f788bfe40f6808bac',
};
export const creatorTermsHref = (version = CURRENT_CREATOR_TERMS.version) => `/workspace/creator-terms?version=${encodeURIComponent(version)}`;
