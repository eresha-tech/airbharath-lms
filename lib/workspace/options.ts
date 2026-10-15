export const AVIATION_BACKGROUNDS = [
  'Pilot / Flight Crew', 'Cabin Crew', 'Aircraft Maintenance / Engineering',
  'Ground Operations', 'Airport Operations', 'Aviation Safety / Quality',
  'Aviation Security', 'Air Traffic / Flight Operations', 'Aviation Management',
  'Aviation Hospitality / Customer Experience', 'Aviation Trainer / Instructor',
  'Aviation Recruitment / Career', 'Drone / UAV', 'Defence Aviation', 'Other Aviation Professional',
] as const;
export const EXPERIENCE_RANGES = ['Less than 2 years', '2–5 years', '6–10 years', '11–15 years', '16–20 years', '20+ years'] as const;
export const COURSE_READINESS = ['I already sell this course', 'My complete course is ready', 'I have some course content ready', 'I have the curriculum planned', 'I currently only have the idea'] as const;
export const TEACHING_EXPERIENCE = ['Yes — professionally', 'Yes — informally / mentoring', 'No — I would like to start'] as const;
export const AUDIENCE_STATUS = ['Yes', 'No', "I'm currently building one"] as const;
export const AUDIENCE_CHANNELS = ['LinkedIn', 'Instagram', 'YouTube', 'WhatsApp', 'Telegram', 'Existing Students', 'Training Community / Institute', 'Email List', 'Other'] as const;
export const AUDIENCE_SIZES = ['Under 500', '500–2,000', '2,001–10,000', '10,001–50,000', '50,000+'] as const;
export const APPLICATION_STATUSES = ['submitted', 'under_review', 'more_information_required', 'interview', 'approved', 'waitlisted', 'declined', 'invited_to_activate'] as const;
export type ApplicationStatus = typeof APPLICATION_STATUSES[number];
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Submitted', under_review: 'Under Review', more_information_required: 'More Information Required',
  interview: 'Interview', approved: 'Approved', waitlisted: 'Waitlisted', declined: 'Declined', invited_to_activate: 'Invited to Activate',
};
export const REVIEW_OPTIONS = {
  aviationCredibilityAssessment: ['Strong', 'Moderate', 'Weak', 'Not Reviewed'],
  subjectExpertiseAssessment: ['Strong', 'Moderate', 'Weak', 'Not Reviewed'],
  courseLegitimacyAssessment: ['Strong', 'Needs Review', 'Concern', 'Not Reviewed'],
  learnerOutcomeAssessment: ['Clear', 'Needs Clarification', 'Weak', 'Not Reviewed'],
  courseIdeaAssessment: ['Strong', 'Average', 'Weak', 'Not Reviewed'],
  teachingAbilityAssessment: ['Proven', 'Potential', 'Unknown'],
  creatorCommitmentAssessment: ['High', 'Medium', 'Low', 'Unknown'],
  distributionReadinessAssessment: ['Strong', 'Moderate', 'Low', 'Unknown'],
  catalogFitAssessment: ['Strong', 'Moderate', 'Weak', 'Not Reviewed'],
  duplicateTopicAssessment: ['None', 'Some', 'High', 'Not Reviewed'],
} as const;
export type ReviewKey = keyof typeof REVIEW_OPTIONS;
export type ReviewAssessments = Partial<{ [K in ReviewKey]: typeof REVIEW_OPTIONS[K][number] }>;
export const REVIEW_LABELS: Record<ReviewKey, string> = {
  aviationCredibilityAssessment: 'Aviation credibility', subjectExpertiseAssessment: 'Subject expertise',
  courseLegitimacyAssessment: 'Course legitimacy', learnerOutcomeAssessment: 'Learner outcome',
  courseIdeaAssessment: 'Course idea', teachingAbilityAssessment: 'Teaching ability',
  creatorCommitmentAssessment: 'Creator commitment', distributionReadinessAssessment: 'Distribution readiness',
  catalogFitAssessment: 'Catalog fit', duplicateTopicAssessment: 'Duplicate topic',
};
export const DECISION_REASONS = ['Insufficient evidence of aviation expertise', 'Course concept unclear', 'Course outside aviation scope', 'Misleading or unverifiable claims', 'Weak learner outcome', 'Similar course already represented', 'Application incomplete', 'Professional/content quality concern', 'Category not currently onboarding', 'Other'] as const;
export const CONSENT_ACCURACY = 'I confirm that the information I have provided is accurate and understand that submitting this application does not guarantee acceptance into AirBharath Workspace.';
export const CONSENT_CONTACT = 'I agree to be contacted by AirBharath regarding my Workspace application and creator onboarding.';
export const CONSENT_VERSION = 'workspace-phase1-v1';
export const APPROVAL_EMAIL_STATUSES = ['not_sent', 'sending', 'sent', 'failed'] as const;
export type ApprovalEmailStatus = typeof APPROVAL_EMAIL_STATUSES[number];
export const APPROVAL_EMAIL_STATUS_LABELS: Record<ApprovalEmailStatus, string> = { not_sent: 'Not Sent', sending: 'Sending', sent: 'Sent', failed: 'Failed' };
