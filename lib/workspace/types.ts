import type { workspaceApplications } from '@/lib/db/schema';
type Row = typeof workspaceApplications.$inferSelect;
type JsonDates<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K] };
export type ApplicationDetail = JsonDates<Omit<Row, 'submissionKey' | 'payloadHash'>> & { approvalEmailSenderName?: string | null };
export type ApplicationSummary = Pick<ApplicationDetail, 'id' | 'applicationReference' | 'fullName' | 'email' | 'aviationBackground' | 'proposedCourseTopic' | 'yearsExperience' | 'courseReadiness' | 'audienceStatus' | 'audienceSize' | 'applicationStatus' | 'submittedAt' | 'potentialDuplicate'>;
