import { beforeEach, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
const mocks = vi.hoisted(() => ({ send: vi.fn(), sign: vi.fn(), config: vi.fn() }));
vi.mock('@aws-sdk/client-s3', async original => ({ ...await original<typeof import('@aws-sdk/client-s3')>(), S3Client: class { constructor(config: unknown) { mocks.config(config); } send = mocks.send; } }));
vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: mocks.sign }));
import { mediaStorageConfig, s3MediaStorage } from '@/lib/workspace/media/provider';
import { uploadFixture, mp4, checksum } from './workspace-media-upload-fixtures';

const config = { region: 'ap-south-1', bucket: 'synthetic-private', accountId: '123456789012', accessKeyId: 'synthetic-id', secretAccessKey: 'synthetic-secret' };
const configured = { WORKSPACE_MEDIA_STORAGE_ENABLED: 'true', WORKSPACE_MEDIA_PRIVATE_VERSIONED_BUCKET: 'true', WORKSPACE_MEDIA_AWS_REGION: config.region, WORKSPACE_MEDIA_S3_BUCKET: config.bucket, WORKSPACE_MEDIA_AWS_ACCOUNT_ID: config.accountId, WORKSPACE_MEDIA_AWS_ACCESS_KEY_ID: config.accessKeyId, WORKSPACE_MEDIA_AWS_SECRET_ACCESS_KEY: config.secretAccessKey };
const body = (bytes: Uint8Array) => ({ transformToWebStream: () => new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }) });
const bucketAccess = { PublicAccessBlockConfiguration: { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true } };
beforeEach(() => { vi.resetAllMocks(); mocks.sign.mockResolvedValue('https://uploads.invalid/temporary');
  mocks.send.mockImplementation(async command => {
    if (command.constructor.name === 'GetPublicAccessBlockCommand') return bucketAccess;
    if (command.constructor.name === 'GetBucketVersioningCommand') return { Status: 'Enabled' };
    throw new Error('Unexpected storage operation');
  });
});
function objects(...values: unknown[]) {
  mocks.send.mockImplementation(async command => {
    if (command.constructor.name === 'GetPublicAccessBlockCommand') return bucketAccess;
    if (command.constructor.name === 'GetBucketVersioningCommand') return { Status: 'Enabled' };
    const value = values.shift(); if (value instanceof Error) throw value; return value;
  });
}
const objectCalls = () => mocks.send.mock.calls.filter(([c]) => ['HeadObjectCommand', 'GetObjectCommand'].includes(c.constructor.name));
async function fixture() {
  const f = uploadFixture(); await f.reserve(); const a = { ...f.state.rows[0], expiresAt: new Date(Date.now() + 86400000) };
  const head = { ContentLength: a.byteSize, ContentType: a.mimeType, ServerSideEncryption: 'AES256', VersionId: 'version-1', ChecksumSHA256: Buffer.from(checksum(mp4), 'hex').toString('base64'), Metadata: { 'workspace-asset': a.id, 'workspace-owner': a.userId, 'workspace-project': a.projectId, 'workspace-lesson': a.lessonId, 'workspace-context': a.contextHash } };
  return { a, head, provider: s3MediaStorage(config), data: { VersionId: 'version-1', ContentLength: mp4.length, ContentRange: `bytes 0-${mp4.length - 1}/${mp4.length}`, Body: body(mp4) } };
}
it('requires all explicit Workspace configuration and never falls back to ambient LMS/AWS credentials', () => {
  expect(mediaStorageConfig(configured)).toMatchObject(config);
  for (const field of Object.keys(configured)) expect(() => mediaStorageConfig({ ...configured, [field]: undefined, AWS_ACCESS_KEY_ID: 'ambient', AWS_SECRET_ACCESS_KEY: 'ambient' })).toThrow('unavailable');
  for (const bucket of ['127.0.0.1', 'bad..bucket', 's3://private', 'https://private']) expect(() => mediaStorageConfig({ ...configured, WORKSPACE_MEDIA_S3_BUCKET: bucket })).toThrow();
});
it('signs conditional, checksum-bound encrypted PUT with identity headers and fixed content length', async () => {
  const { a, provider } = await fixture();
  const result = await provider.authorize(a, checksum(mp4), 600);
  const command = mocks.sign.mock.calls[0][1], options = mocks.sign.mock.calls[0][2];
  expect(command.input).toMatchObject({ Bucket: config.bucket, ExpectedBucketOwner: config.accountId, Key: a.storageKey, IfNoneMatch: '*', ContentLength: a.byteSize, ChecksumSHA256: Buffer.from(checksum(mp4), 'hex').toString('base64'), ServerSideEncryption: 'AES256' });
  expect(options.expiresIn).toBe(600); expect(options.signableHeaders.has('content-length')).toBe(true); expect(options.unhoistableHeaders.has('x-amz-checksum-sha256')).toBe(true);
  expect(result.headers['If-None-Match']).toBe('*'); expect(objectCalls()).toHaveLength(0); expect(mocks.config).toHaveBeenCalledWith(expect.objectContaining({ maxAttempts: 2, ignoreConfiguredEndpointUrls: true, requestChecksumCalculation: 'WHEN_REQUIRED', credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, sessionToken: undefined } }));
});
it('pins verification reads to the storage-reported immutable version and bounds video inspection to a prefix', async () => {
  const { a, head, data, provider } = await fixture(); objects(head, data);
  expect(await provider.inspect(a)).toMatchObject({ versionId: 'version-1', checksum: checksum(mp4), prefix: mp4 });
  expect(objectCalls()[0][0].input).toMatchObject({ ChecksumMode: 'ENABLED', ExpectedBucketOwner: config.accountId });
  expect(objectCalls()[1][0].input).toMatchObject({ VersionId: 'version-1', Range: `bytes=0-${mp4.length - 1}` });
});
it.each(['size', 'mime', 'identity', 'version', 'checksum', 'encryption', 'encoding'])('rejects storage-side %s mismatch before reading object bytes', async field => {
  const { a, head, provider } = await fixture();
  const changed = { ...head, ...(field === 'size' ? { ContentLength: 1 } : field === 'mime' ? { ContentType: 'text/html' } : field === 'identity' ? { Metadata: {} } : field === 'version' ? { VersionId: 'null' } : field === 'checksum' ? { ChecksumSHA256: 'invalid' } : field === 'encoding' ? { ContentEncoding: 'gzip' } : { ServerSideEncryption: undefined }) };
  objects(changed); await expect(provider.inspect(a)).rejects.toMatchObject({ code: 'verification' }); expect(objectCalls()).toHaveLength(1);
});
it.each(['ignored_range', 'oversized_body', 'truncated_body', 'wrong_version'])('fails closed for %s without accepting an unbounded stream', async reason => {
  const { a, head, data, provider } = await fixture();
  const changed = { ...data, ...(reason === 'ignored_range' ? { ContentRange: undefined } : reason === 'wrong_version' ? { VersionId: 'other' } : { Body: body(reason === 'oversized_body' ? new Uint8Array(a.byteSize + 1) : new Uint8Array(2)) }) };
  objects(head, changed); await expect(provider.inspect(a)).rejects.toMatchObject({ code: 'verification' });
});
it('makes missing objects recoverable while keeping provider/account errors private', async () => {
  const { a, provider } = await fixture(); objects(Object.assign(new Error('private detail'), { name: 'NotFound' }));
  await expect(provider.inspect(a)).rejects.toMatchObject({ code: 'object_missing' });
  await expect(provider.authorize({ ...a, storageContainer: 'other' }, createHash('sha256').update('test').digest('hex'), 600)).rejects.toMatchObject({ code: 'unavailable' });
});

it.each(['public', 'unversioned'])('refuses %s buckets before upload signing', async state => {
 const { a, provider } = await fixture(); mocks.send.mockImplementation(async command => command.constructor.name === 'GetPublicAccessBlockCommand' ? { PublicAccessBlockConfiguration: { ...bucketAccess.PublicAccessBlockConfiguration, BlockPublicPolicy: state !== 'public' } } : { Status: state === 'unversioned' ? 'Suspended' : 'Enabled' });
 await expect(provider.authorize(a, checksum(mp4), 600)).rejects.toMatchObject({ code: 'unavailable' }); expect(mocks.sign).not.toHaveBeenCalled();
});

it('clamps signing lifetime after bucket checks to the original intent deadline', async () => {
 const { a, provider } = await fixture(); a.expiresAt=new Date(Date.now()+5000);
 const auth=await provider.authorize(a,checksum(mp4),1000);
 expect(mocks.sign.mock.calls[0][2].expiresIn).toBeLessThanOrEqual(5); expect(Date.parse(auth.expiresAt)).toBeLessThanOrEqual(a.expiresAt.getTime());
});
