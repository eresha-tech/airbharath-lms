import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
const mocks = vi.hoisted(() => ({ db: { transaction: vi.fn(), query: { workspaceEligibilityAttempts: { findFirst: vi.fn() }, users: { findFirst: vi.fn() } } }, session: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: mocks.db }));
vi.mock('@/lib/auth', () => ({ getSession: mocks.session }));
import { workspaceEligibilityAttempts as attempts, workspaceEligibilitySettings as settings, workspacePolicyVersions as policies, users } from '@/lib/db/schema';
import { getWorkspaceUser, getWorkspaceJourneyState, recoverSubmission, submissionHash, submitEligibility, publishSettings, EligibilityError } from '@/lib/workspace/eligibility/service';
import { validateSubmission, evaluateEligibility } from '@/lib/workspace/eligibility/model';
import { input, setting, policy, now, userId, key } from './workspace-eligibility-fixtures';
function normalized(value = input) { const parsed = validateSubmission(value); if (!parsed.success) throw new Error('invalid fixture'); return parsed.data; }
const dialect = new PgDialect();
function params(query: { where: SQL }) { return dialect.sqlToQuery(query.where).params; }
// An in-memory transaction/lock harness tests service ordering and races, not PostgreSQL isolation.
let saved: Record<string, unknown>[]; let versions: typeof setting[]; let audits: Record<string, unknown>[]; let actorRole: string; let locks: string[];
beforeEach(() => {
  saved = []; versions = [structuredClone(setting)]; audits = []; actorRole = 'admin'; locks = [];
  let tail: Promise<unknown> = Promise.resolve();
  mocks.db.transaction.mockImplementation(callback => {
    const run = tail.then(async () => {
      const tx = {
        select: () => ({ from: (table: unknown) => ({ where: () => ({ for: async (mode: string) => {
          locks.push(`${table === users ? 'users' : table === settings ? 'settings' : 'policies'}:${mode}`);
          return table === users ? [{ id: userId, role: actorRole }] : table === settings ? versions.filter(v => v.isCurrent) : table === policies ? [policy] : [];
        } }) }) }),
        query: {
          workspaceEligibilityAttempts: { findFirst: async (query: { where: SQL }) => { const values = params(query); const owned = saved.filter(row => row.userId === values[0]); return values.length === 2 ? owned.find(row => row.submissionKey === values[1]) : owned.at(-1); } },
          workspaceAuditEvents: { findFirst: async (query: { where: SQL }) => { const values = params(query); return audits.find(row => row.actorId === values[0] && row.requestKey === values[1]); } },
          workspaceEligibilitySettings: { findFirst: async (query: { where: SQL }) => versions.find(row => row.id === params(query)[0]) },
        },
        update: () => ({ set: (patch: object) => ({ where: async () => { Object.assign(versions.find(v => v.isCurrent)!, patch); } }) }),
        insert: (table: unknown) => ({ values: (values: Record<string, unknown>) => {
          const row = { id: `generated-${saved.length + versions.length + audits.length}`, ...values };
          if (table === attempts) saved.push(row); else if (table === settings) versions.push(row as unknown as typeof setting); else audits.push(row);
          return { returning: async () => [row] };
        } }),
      };
      return callback(tx);
    });
    tail = run.catch(() => undefined); return run;
  });
});
describe('eligibility persistence boundary', () => {
  it('serializes double clicks and matching keys, preserving one result with versions', async () => {
    const data = normalized();
    const results = await Promise.all([submitEligibility(userId, data, () => now), submitEligibility(userId, data, () => now)]);
    expect(saved).toHaveLength(1); expect(results.map(r => r.created)).toEqual([true, false]);
    expect(saved[0]).toMatchObject({ userId, settingsId: setting.id, policyId: policy.id, experienceMonths: 24, evaluatorVersion: setting.evaluatorVersion, source: 'automatic', submittedAt: now, decidedAt: now });
    expect(locks[0]).toBe('users:update'); expect(locks).toContain('settings:share');
    await expect(submitEligibility(userId, normalized({ ...input, courseIdea: 'Changed' }), () => now)).rejects.toMatchObject({ code: 'conflict' });
    expect(saved).toHaveLength(1);
  });
  it.each(['two_years', 'one_year'])('different-tab keys cannot mint attempts during active %s state', async experienceOption => {
    const a = normalized({ ...input, experienceOption });
    const b = normalized({ ...input, experienceOption, submissionKey: '55555555-5555-4555-8555-555555555555' });
    const results = await Promise.all([submitEligibility(userId, a, () => now), submitEligibility(userId, b, () => now)]);
    expect(saved).toHaveLength(1); expect(results.map(r => r.created)).toEqual([true, false]);
  });
  it.each(['two_years', 'one_year'])('permits a fresh key exactly at the %s deadline', async experienceOption => {
    const a = normalized({ ...input, experienceOption }); await submitEligibility(userId, a, () => now);
    const decision = evaluateEligibility(a, setting.config, now);
    const deadline = decision.eligibleUntil || decision.reapplyAt!;
    await submitEligibility(userId, normalized({ ...input, experienceOption, submissionKey: '55555555-5555-4555-8555-555555555555' }), () => deadline);
    expect(saved).toHaveLength(2);
  });
  it('rejects stale version and missing required profile before insertion; optional profile remains configurable', async () => {
    await expect(submitEligibility(userId, normalized({ ...input, settingsId: key }), () => now)).rejects.toMatchObject({ code: 'conflict' });
    await expect(submitEligibility(userId, normalized({ ...input, professionalProfileUrl: '' }), () => now)).rejects.toMatchObject({ code: 'validation' });
    expect(saved).toHaveLength(0);
    versions[0].config.profileRequired = false;
    expect((await submitEligibility(userId, normalized({ ...input, professionalProfileUrl: '' }), () => now)).created).toBe(true);
  });
  it('recovering a saved submission requires its owner AND the same normalized payload', async () => {
    const data = normalized(); const row = { ...data, userId, payloadHash: submissionHash(data) };
    mocks.db.query.workspaceEligibilityAttempts.findFirst.mockImplementation(async query => { const values = params(query); return values[0] === userId && values[1] === key ? row : undefined; });
    expect(await recoverSubmission(userId, data)).toBe(row);
    expect(await recoverSubmission('66666666-6666-4666-8666-666666666666', data)).toBeNull();
    await expect(recoverSubmission(userId, normalized({ ...input, courseIdea: 'Changed' }))).rejects.toBeInstanceOf(EligibilityError);
  });
  it('rechecks persisted account and resolves owned history without returning form answers', async () => {
    mocks.session.mockResolvedValue({ id: userId, role: 'admin' }); mocks.db.query.users.findFirst.mockResolvedValue(undefined);
    expect(await getWorkspaceUser()).toBeNull();
    mocks.db.query.users.findFirst.mockResolvedValue({ id: userId, role: 'student' });
    expect(await getWorkspaceUser()).toMatchObject({ role: 'student' });
    mocks.db.query.workspaceEligibilityAttempts.findFirst.mockResolvedValue({ id: key, ...evaluateEligibility(normalized(), setting.config, now), payloadHash: 'private', professionalProfileUrl: 'private' });
    const result = await getWorkspaceJourneyState(userId, () => now);
    expect(result.state).toBe('eligibility_active'); expect(result.attempt).not.toHaveProperty('payloadHash'); expect(result.attempt).not.toHaveProperty('professionalProfileUrl');
  });
});
describe('settings version publication', () => {
  it('concurrent publication from one version yields one successor, one current and one audit', async () => {
    const a = { expectedSettingsId: setting.id, requestKey: key, config: { ...setting.config, cooldownDays: 8 } };
    const b = { ...a, requestKey: '55555555-5555-4555-8555-555555555555' };
    const results = await Promise.allSettled([publishSettings(userId, a, () => now), publishSettings(userId, b, () => now)]);
    expect(results.map(r => r.status)).toEqual(['fulfilled', 'rejected']); expect(versions).toHaveLength(2); expect(versions.filter(v => v.isCurrent)).toHaveLength(1); expect(audits).toHaveLength(1);
    expect(versions[0].config.cooldownDays).toBe(7); expect(versions[1].config.cooldownDays).toBe(8);
    expect(await publishSettings(userId, a, () => now)).toBe(versions[1]); expect(audits).toHaveLength(1);
    await expect(publishSettings(userId, { ...a, config: setting.config }, () => now)).rejects.toMatchObject({ code: 'conflict' });
  });
  it('denies a demoted admin inside the publication transaction', async () => {
    actorRole = 'student'; await expect(publishSettings(userId, { expectedSettingsId: setting.id, requestKey: key, config: setting.config })).rejects.toMatchObject({ code: 'authentication' });
    expect(versions).toHaveLength(1); expect(audits).toHaveLength(0); expect(locks).toEqual(['users:share']);
  });
});
