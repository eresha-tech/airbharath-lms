import { DECLARATIONS, DEFAULT_SETTINGS, type Declarations } from '@/lib/workspace/eligibility/model';
export const userId = '11111111-1111-4111-8111-111111111111';
export const settingsId = '22222222-2222-4222-8222-222222222222';
export const policyId = '33333333-3333-4333-8333-333333333333';
export const key = '44444444-4444-4444-8444-444444444444';
export const now = new Date('2026-10-06T12:00:00.000Z');
export const input = { submissionKey: key, settingsId, policyId, category: 'pilot_flight_crew', aviationProfession: '', experienceOption: 'two_years', professionalStatus: 'retired', professionalStatusDetail: '', professionalProfileUrl: 'https://www.linkedin.com/in/example', teachingCategory: 'flight_operations', courseIdea: 'Flight preparation', declarations: Object.fromEntries(Object.keys(DECLARATIONS).map(key => [key, true])) as Declarations };
export const setting = { id: settingsId, version: 1, config: structuredClone(DEFAULT_SETTINGS), evaluatorVersion: 'workspace-eligibility-v1', isCurrent: true };
export const policy = { id: policyId, version: 'workspace-eligibility-declarations-v1', declarations: DECLARATIONS, isCurrent: true };
