import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  insert: vi.fn(),
  findVideo: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    update: mocks.update,
    insert: mocks.insert,
    query: { videos: { findFirst: mocks.findVideo } },
  },
}));

import { POST } from '@/app/api/videos/webhook/transcoded/route';

const secret = 'synthetic-webhook-secret';
const videoId = '00000000-0000-4000-8000-000000000011';
const courseId = '00000000-0000-4000-8000-000000000012';

function request(body: unknown, credential: string | null = secret) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (credential !== null) headers.set('x-aws-webhook-secret', credential);

  return new Request('http://test.invalid/api/videos/webhook/transcoded', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function event(status: 'COMPLETE' | 'ERROR', overrides: Record<string, unknown> = {}) {
  return {
    detail: {
      status,
      userMetadata: { videoId, courseId },
      outputGroupDetails: [{ outputDetails: [{ durationInMs: 12_400 }] }],
      errorMessage: 'Synthetic transcoding failure',
      ...overrides,
    },
  };
}

function updateReturning(rows: unknown[]) {
  return {
    set: vi.fn(() => ({
      where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue(rows) })),
    })),
  };
}

function expectNoDatabaseAccess() {
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.insert).not.toHaveBeenCalled();
  expect(mocks.findVideo).not.toHaveBeenCalled();
}

describe('POST /api/videos/webhook/transcoded', () => {
  beforeEach(() => {
    vi.stubEnv('AWS_WEBHOOK_SECRET', secret);
    mocks.update.mockImplementation(() => updateReturning([{ id: videoId }]));
    mocks.findVideo.mockResolvedValue(null);
  });

  it.each([
    ['missing server secret', null, secret, 503],
    ['empty server secret', '', secret, 503],
    ['missing request credential', secret, null, 403],
    ['invalid request credential', secret, 'incorrect-synthetic-secret', 403],
  ])('rejects %s without any database access', async (_label, configuredSecret, credential, status) => {
    if (configuredSecret === null) delete process.env.AWS_WEBHOOK_SECRET;
    else vi.stubEnv('AWS_WEBHOOK_SECRET', configuredSecret);

    const response = await POST(request(event('COMPLETE'), credential));

    expect(response.status).toBe(status);
    expectNoDatabaseAccess();
  });

  it('rejects malformed authenticated JSON without database access', async () => {
    const response = await POST(new Request('http://test.invalid', {
      method: 'POST',
      headers: { 'x-aws-webhook-secret': secret },
      body: '{',
    }));

    expect(response.status).toBe(400);
    expectNoDatabaseAccess();
  });

  it('rejects malformed UUIDs without mutation', async () => {
    const response = await POST(request(event('COMPLETE', {
      userMetadata: { videoId: 'not-a-uuid', courseId },
    })));

    expect(response.status).toBe(400);
    expectNoDatabaseAccess();
  });

  it('cannot mutate a video when the video/course pair does not match', async () => {
    mocks.update.mockImplementation(() => updateReturning([]));

    const response = await POST(request(event('COMPLETE')));

    expect(response.status).toBe(404);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('updates an authenticated COMPLETE event for the matching video/course', async () => {
    const response = await POST(request(event('COMPLETE')));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.findVideo).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('updates an eligible video for an authenticated ERROR event', async () => {
    const response = await POST(request(event('ERROR')));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.findVideo).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('does not regress a ready video when a delayed ERROR event arrives', async () => {
    mocks.update.mockImplementation(() => updateReturning([]));
    mocks.findVideo.mockResolvedValue({ id: videoId, courseId, status: 'ready' });

    const response = await POST(request(event('ERROR')));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ignored).toBe(true);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('handles duplicate legitimate COMPLETE events without creating records', async () => {
    const first = await POST(request(event('COMPLETE')));
    const second = await POST(request(event('COMPLETE')));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledTimes(2);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
