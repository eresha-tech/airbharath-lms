import { AVIATION_BACKGROUNDS, EXPERIENCE_RANGES, COURSE_READINESS, TEACHING_EXPERIENCE } from '@/lib/workspace/options';
import { emptyApplication } from '@/lib/workspace/validation';
export const applicant = {
  ...emptyApplication(), fullName: 'Test Aviation Professional', email: 'applicant@example.test',
  mobile: '+91 98765 43210', city: 'Delhi', country: 'India', aviationBackground: AVIATION_BACKGROUNDS[1],
  currentRole: 'Trainer', yearsExperience: EXPERIENCE_RANGES[1], proposedCourseTopic: 'Cabin Crew Interview Preparation',
  courseDescription: 'Practical interview preparation.', targetLearner: 'Aspirants', learnerOutcome: 'Prepare confidently for an interview.',
  courseReadiness: COURSE_READINESS[4], teachingExperienceType: TEACHING_EXPERIENCE[2], audienceStatus: 'No',
  joiningReason: 'Share aviation knowledge.', consentAccuracy: true, consentContact: true,
  submissionKey: '00000000-0000-4000-8000-000000000011',
};
export const applicationId = '00000000-0000-4000-8000-000000000012';
export const adminId = '00000000-0000-4000-8000-000000000013';
export const updatedAt = new Date('2026-10-02T10:00:00.000Z');
export const reviewPayload = {
  applicationStatus: 'under_review', reviewAssessments: { aviationCredibilityAssessment: 'Strong' },
  internalNotes: 'Evidence to review.', decisionReason: '', expectedUpdatedAt: updatedAt.toISOString(),
};
