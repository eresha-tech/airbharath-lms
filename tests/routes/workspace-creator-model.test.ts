import { describe, expect, it } from 'vitest';
import { creatorCapabilities, parseCommand, validateDraft, validateProfile, version, MAX_PRICE_PAISE } from '@/lib/workspace/creator/model';
import { content, evidence, now, profile, key } from './workspace-creator-fixtures';
describe('central persisted Workspace read/edit capabilities', () => {
  it.each(['development', 'test'])('early access has read and edit in %s', environment => { expect(creatorCapabilities(evidence, now, environment)).toMatchObject({ state: 'early_access', canViewCreatorWorkspace: true, canEditWorkspace: true, hasPaidEntitlement: true }); });
  it('active starts exactly at start; expiry ends edits exactly at end and retains reads', () => {
    expect(creatorCapabilities(evidence, evidence.membership.startsAt, 'test')).toMatchObject({ state: 'active', canEditWorkspace: true });
    expect(creatorCapabilities(evidence, new Date(evidence.membership.endsAt.getTime() - 1), 'test').canEditWorkspace).toBe(true);
    expect(creatorCapabilities(evidence, evidence.membership.endsAt, 'test')).toMatchObject({ state: 'expired', canEditWorkspace: false, canViewCreatorWorkspace: true, hasCreatorAccess: false, hasPaidEntitlement: false });
  });
  it.each(['suspended', 'terminated'] as const)('%s identity denies reads/edits without deleting history', status => { for (const at of [now, evidence.membership.endsAt]) expect(creatorCapabilities({ ...evidence, profileStatus: status }, at, 'test')).toMatchObject({ canViewCreatorWorkspace: false, canEditWorkspace: false }); });
  it.each(['pending_activation', 'held_for_review'] as const)('%s is never a creator grant', activationState => { expect(creatorCapabilities({ ...evidence, activationState }, now, 'test').canEditWorkspace).toBe(false); });
  it('eligibility/unpaid, a held latest order and future/invalid fulfillment deny access', () => {
    expect(creatorCapabilities(null, now, 'test').canViewCreatorWorkspace).toBe(false);
    expect(creatorCapabilities(evidence, now, 'test', true).canViewCreatorWorkspace).toBe(false);
    expect(creatorCapabilities({ ...evidence, membership: { ...evidence.membership, fulfilledAt: new Date('2026-12-01'), accessGrantedAt: new Date('2026-12-01') } }, now, 'test').canEditWorkspace).toBe(false);
    expect(creatorCapabilities({ ...evidence, membership: { ...evidence.membership, accessGrantedAt: now } }, now, 'test').canEditWorkspace).toBe(false);
  });
  it.each([undefined, 'production', 'staging'])('test evidence never grants read or edit in %s', environment => { for (const at of [now, evidence.membership.endsAt]) expect(creatorCapabilities(evidence, at, environment)).toMatchObject({ canViewCreatorWorkspace: false, canEditWorkspace: false }); });
});
describe('bounded profile and draft validation', () => {
  it('normalizes text, permits optional null price and preserves controlled structured content', () => { expect(validateDraft({ ...content, title: '  Cabin safety  ', tentativePricePaise: null })).toMatchObject({ title: 'Cabin safety', tentativePricePaise: null }); expect(validateProfile({ ...profile, professionalProfileUrl: null })).toMatchObject({ professionalProfileUrl: null }); });
  it.each([0, -1, 1.5, MAX_PRICE_PAISE + 1, '2500', Number.NaN])('rejects unsafe price %s', price => { expect(() => validateDraft({ ...content, tentativePricePaise: price })).toThrow(); });
  it.each([1, MAX_PRICE_PAISE])('accepts positive boundary price %s', price => { expect(validateDraft({ ...content, tentativePricePaise: price }).tentativePricePaise).toBe(price); });
  it.each([
    { title: 'ab' }, { title: 'x'.repeat(201) }, { title: '<b>Title</b>' }, { title: 'Title\u0000' }, { category: 'unapproved' }, { description: 'x'.repeat(49) }, { description: 'x'.repeat(5001) }, { targetLearner: '' }, { targetLearner: 'x'.repeat(1001) }, { learningOutcomes: [] }, { learningOutcomes: Array(11).fill('Outcome') }, { learningOutcomes: ['x'.repeat(301)] }, { learningOutcomes: [{ arbitrary: 'JSON' }] }, { outline: Array(21).fill(content.outline[0]) }, { outline: [{ title: 'Topic', ordering: 2 }] }, { outline: [{ title: 'Topic', description: 'x'.repeat(1001), ordering: 0 }] }, { outline: [{ title: 'Topic', ordering: 0, executable: 'javascript' }] }, { userId: 'forged' }, { creatorProfileId: 'forged' }, { status: 'published' }, { currency: 'USD' },
  ])('rejects invalid content %j', patch => { expect(() => validateDraft({ ...content, ...patch })).toThrow(); });
  it.each([{ displayName: 'x' }, { displayName: 'x'.repeat(101) }, { professionalHeadline: 'x'.repeat(161) }, { shortBio: 'x'.repeat(1001) }, { shortBio: '<script>x</script>' }, { primaryAviationCategory: 'random' }, { professionalProfileUrl: 'http://example.com' }, { professionalProfileUrl: 'https://localhost/private' }, { professionalProfileUrl: 'https://127.0.0.1/private' }, { professionalProfileUrl: 'https://user:password@example.com' }, { userId: 'forged' }, { creatorProfileId: 'forged' }, { status: 'enabled' }])('rejects unsafe profile %j', patch => { expect(() => validateProfile({ ...profile, ...patch })).toThrow(); });
  it('accepts text bounds, sequential outline, null URL and rejects forged command fields', () => {
    expect(validateDraft({ ...content, description: 'x'.repeat(5000), learningOutcomes: Array(10).fill('x'.repeat(300)), outline: Array.from({ length: 20 }, (_, ordering) => ({ title: 'Topic', ordering })) }).outline).toHaveLength(20);
    expect(validateProfile({ ...profile, displayName: 'x'.repeat(100), professionalHeadline: 'x'.repeat(160), shortBio: 'x'.repeat(1000) }).shortBio).toHaveLength(1000);
    expect(parseCommand({ requestKey: key, content }, 'create').requestKey).toBe(key);
    expect(() => parseCommand({ requestKey: key, content, userId: 'forged' }, 'create')).toThrow();
    expect(() => parseCommand({ requestKey: 'bad', content }, 'create')).toThrow();
    for (const value of [-1, 1.5, '5', 2_147_483_647]) expect(() => version(value)).toThrow();
  });
});
