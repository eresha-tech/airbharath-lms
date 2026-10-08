import { creatorCapabilities } from '../creator/model';
import { readWorkspaceAccess } from '../activation/repository';
import { resolveMembershipAccess } from '../activation/model';
import { createHash } from 'node:crypto';
import { and, desc, eq, gt, lte } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, workspaceEligibilityAttempts as attempts, workspaceEligibilitySettings as settings, workspacePolicyVersions as policies, workspaceAuditEvents as audits } from '@/lib/db/schema';
import { EVALUATOR_VERSION, ELIGIBILITY_POLICY_VERSION, UUID, evaluateEligibility, resolveJourney, validateSettings, type Submission, type SettingsConfig } from './model';

export class EligibilityError extends Error {
  constructor(public code: 'conflict' | 'validation' | 'unavailable' | 'authentication', public fields?: Record<string, string>) { super(code); }
}
export function submissionHash(data: Submission) { return createHash('sha256').update(JSON.stringify(data)).digest('hex'); }
export async function getWorkspaceUser() {
  const session = await getSession();
  if (!session || !UUID.test(session.id)) return null;
  return await db.query.users.findFirst({ where: eq(users.id, session.id), columns: { id: true, fullName: true, role: true } }) || null;
}
export async function getWorkspaceJourneyState(userId: string, clock = () => new Date()) {
  const user = UUID.test(userId) ? await db.query.users.findFirst({ where: eq(users.id, userId), columns: { id: true } }) : null;
  const latest = user ? await db.query.workspaceEligibilityAttempts.findFirst({ where: eq(attempts.userId, userId), orderBy: [desc(attempts.decidedAt), desc(attempts.id)] }) || null : null;
  const now = clock();
  const access = user ? await readWorkspaceAccess(userId) : null;
  const capability = resolveMembershipAccess(access?.row ? { profileStatus: access.row.profile.status, activationState: access.row.order.activationState, providerMode: access.row.order.providerMode, commercialPolicyVersion: access.row.order.commercialPolicyVersion, membership: access.row.membership } : null, now, process.env.NODE_ENV === 'production' ? 'production' : process.env.DATABASE_ENV);
  const financialReview = access?.latestOrder?.activationState === 'held_for_review';
  const memberState = access?.row && (access.row.profile.status !== 'enabled' || (!capability.hasCreatorAccess && capability.state !== 'expired')) ? 'creator_unavailable' : capability.state;
  const state = financialReview ? 'financial_review' : memberState || (access?.latestOrder?.financialState === 'captured' ? 'activation_pending' : null);
  const creator = creatorCapabilities(access?.row ? { profileStatus: access.row.profile.status, activationState: access.row.order.activationState, providerMode: access.row.order.providerMode, commercialPolicyVersion: access.row.order.commercialPolicyVersion, membership: access.row.membership } : null, now, process.env.NODE_ENV === 'production' ? 'production' : process.env.DATABASE_ENV, financialReview);
  return { ...resolveJourney(!!user, latest, now), hasCreatorAccess: capability.hasCreatorAccess, hasPaidEntitlement: capability.hasPaidEntitlement, ...(financialReview ? { hasCreatorAccess: false, hasPaidEntitlement: false } : {}), ...(state ? { state, destination: creator.canViewCreatorWorkspace ? '/workspace/dashboard' : '/workspace/member' } : {}), attempt: latest ? eligibilityReceipt(latest) : null };
}
export async function getEligibilityFormConfig() {
  const [currentSettings, policy] = await Promise.all([
    db.query.workspaceEligibilitySettings.findFirst({ where: eq(settings.isCurrent, true) }),
    db.query.workspacePolicyVersions.findFirst({ where: eq(policies.isCurrent, true) }),
  ]);
  if (!currentSettings || !policy || policy.version !== ELIGIBILITY_POLICY_VERSION || currentSettings.evaluatorVersion !== EVALUATOR_VERSION || !validateSettings(currentSettings.config)) throw new EligibilityError('unavailable');
  return { settings: currentSettings, policy };
}
export async function recoverSubmission(userId: string, data: Submission) {
  const prior = await db.query.workspaceEligibilityAttempts.findFirst({ where: and(eq(attempts.userId, userId), eq(attempts.submissionKey, data.submissionKey)) });
  if (prior && prior.payloadHash !== submissionHash(data)) throw new EligibilityError('conflict');
  return prior || null;
}
export async function submitEligibility(userId: string, data: Submission, clock = () => new Date()) {
  return db.transaction(async tx => {
    const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
    if (!user) throw new EligibilityError('authentication');
    const prior = await tx.query.workspaceEligibilityAttempts.findFirst({ where: and(eq(attempts.userId, userId), eq(attempts.submissionKey, data.submissionKey)) });
    const hash = submissionHash(data);
    if (prior) {
      if (prior.payloadHash !== hash) throw new EligibilityError('conflict');
      return { attempt: prior, created: false };
    }
    const latest = await tx.query.workspaceEligibilityAttempts.findFirst({ where: eq(attempts.userId, userId), orderBy: [desc(attempts.decidedAt), desc(attempts.id)] });
    // Time is sampled after the per-user lock, not before a potentially long wait.
    const now = clock();
    const journey = resolveJourney(true, latest || null, now);
    if (latest && ['eligibility_active', 'ineligible_cooldown'].includes(journey.state)) return { attempt: latest, created: false };
    const [current] = await tx.select().from(settings).where(eq(settings.isCurrent, true)).for('share');
    const [policy] = await tx.select().from(policies).where(eq(policies.isCurrent, true)).for('share');
    if (!current || !policy || policy.version !== ELIGIBILITY_POLICY_VERSION || current.evaluatorVersion !== EVALUATOR_VERSION || !validateSettings(current.config)) throw new EligibilityError('unavailable');
    if (data.settingsId !== current.id || data.policyId !== policy.id) throw new EligibilityError('conflict');
    if (current.config.profileRequired && !data.professionalProfileUrl) throw new EligibilityError('validation', { professionalProfileUrl: 'A professional HTTPS profile is required.' });
    const { submissionKey, settingsId, policyId, ...answers } = data;
    const decision = evaluateEligibility(answers, current.config, now);
    const [attempt] = await tx.insert(attempts).values({ ...answers, userId, submissionKey, settingsId, policyId, payloadHash: hash,
      ...decision, submittedAt: now, acceptedAt: now, source: 'automatic', evaluatorVersion: current.evaluatorVersion }).returning();
    return { attempt, created: true };
  });
}
export async function publishSettings(actorId: string, input: { expectedSettingsId: string; requestKey: string; config: SettingsConfig }, clock = () => new Date()) {
  const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return db.transaction(async tx => {
    // Recheck/lock persisted role inside the publication transaction, including demotion races.
    const [actor] = await tx.select({ role: users.role }).from(users).where(eq(users.id, actorId)).for('share');
    if (!actor || actor.role !== 'admin') throw new EligibilityError('authentication');
    const [current] = await tx.select().from(settings).where(eq(settings.isCurrent, true)).for('update');
    const prior = await tx.query.workspaceAuditEvents.findFirst({ where: and(eq(audits.actorId, actorId), eq(audits.requestKey, input.requestKey)) });
    if (prior) {
      if (prior.payloadHash !== hash || prior.action !== 'eligibility_settings_published' || !prior.settingsId) throw new EligibilityError('conflict');
      return await tx.query.workspaceEligibilitySettings.findFirst({ where: eq(settings.id, prior.settingsId) });
    }
    if (!current || current.id !== input.expectedSettingsId) throw new EligibilityError('conflict');
    await tx.update(settings).set({ isCurrent: false }).where(eq(settings.id, current.id));
    const [published] = await tx.insert(settings).values({ version: current.version + 1, config: input.config,
      configurationHash: createHash('sha256').update(JSON.stringify(input.config)).digest('hex'), evaluatorVersion: EVALUATOR_VERSION,
      isCurrent: true, publishedAt: clock(), publishedBy: actorId }).returning();
    await tx.insert(audits).values({ actorId, settingsId: published.id, previousSettingsId: current.id, requestKey: input.requestKey, payloadHash: hash, createdAt: clock() });
    return published;
  });
}
export const ADMIN_FILTERS = ['all', 'eligible', 'ineligible', 'current_eligible', 'expired', 'cooldown_active'] as const;
export async function listEligibilityAttempts(filter: typeof ADMIN_FILTERS[number], page: number, now = new Date()) {
  const predicate = filter === 'eligible' || filter === 'ineligible' ? eq(attempts.result, filter) :
    filter === 'current_eligible' ? and(eq(attempts.result, 'eligible'), gt(attempts.eligibleUntil, now)) :
    filter === 'expired' ? and(eq(attempts.result, 'eligible'), lte(attempts.eligibleUntil, now)) :
    filter === 'cooldown_active' ? and(eq(attempts.result, 'ineligible'), gt(attempts.reapplyAt, now)) : undefined;
  const rows = await db.select({ id: attempts.id, category: attempts.category, experienceOption: attempts.experienceOption, result: attempts.result,
    decidedAt: attempts.decidedAt, eligibleUntil: attempts.eligibleUntil, reapplyAt: attempts.reapplyAt, settingsVersion: settings.version,
    fullName: users.fullName, phone: users.phone, email: users.email }).from(attempts).innerJoin(users, eq(attempts.userId, users.id))
    .innerJoin(settings, eq(attempts.settingsId, settings.id)).where(predicate).orderBy(desc(attempts.decidedAt), desc(attempts.id)).limit(21).offset((page - 1) * 20);
  return { attempts: rows.slice(0, 20), hasNext: rows.length > 20, page, filter, serverNow: now.toISOString() };
}
export async function getAdminEligibilityAttempt(id: string) {
  const [row] = await db.select({ attempt: attempts, settings, policy: policies, user: { id: users.id, fullName: users.fullName, email: users.email, phone: users.phone } })
    .from(attempts).innerJoin(users, eq(attempts.userId, users.id)).innerJoin(settings, eq(attempts.settingsId, settings.id))
    .innerJoin(policies, eq(attempts.policyId, policies.id)).where(eq(attempts.id, id)).limit(1);
  return row || null;
}
export function parseAdminList(url: URL) {
  const filter = url.searchParams.get('filter') || 'all'; const page = Number(url.searchParams.get('page') || 1);
  if (!(ADMIN_FILTERS as readonly string[]).includes(filter) || !Number.isInteger(page) || page < 1 || page > 500) return null;
  return { filter: filter as typeof ADMIN_FILTERS[number], page };
}

export function eligibilityReceipt(attempt: import("./model").JourneyAttempt) {
  const { id, result, reasons, decidedAt, eligibleUntil, reapplyAt } = attempt;
  return { id, result, reasons, decidedAt, eligibleUntil, reapplyAt };
}
