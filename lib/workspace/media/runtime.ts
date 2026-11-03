import 'server-only';
import { environment } from '../creator/model';
import { postgresMediaStore } from './repository';
import { mediaService, type StorageIdentity } from './service';
import { mediaStorageConfig, s3MediaStorage, type MediaStorage } from './provider';
import { mediaUploads } from './uploads';

// Storage-disabled metadata inspection/detachment remain independent of provider configuration.
export function workspaceMedia() {
  let storage: StorageIdentity | undefined;
  if (process.env.WORKSPACE_MEDIA_STORAGE_ENABLED === 'true') {
    storage = { provider: 's3', container: process.env.WORKSPACE_MEDIA_S3_BUCKET || '', accountId: process.env.WORKSPACE_MEDIA_AWS_ACCOUNT_ID || '' };
  }
  return mediaService(postgresMediaStore, environment(), () => new Date(), storage);
}
export function workspaceMediaUploads() {
  let provider: MediaStorage | undefined;
  try { provider = s3MediaStorage(mediaStorageConfig()); } catch { /* Disabled/misconfigured storage fails closed only for provider operations. */ }
  return mediaUploads(postgresMediaStore, environment(), () => new Date(), provider, true);
}
export function workspaceMediaStorage() { return s3MediaStorage(mediaStorageConfig()); }

import { mediaProcessing } from './processing';
import { processingConfig, processingProvider } from './processing-provider';
export function workspaceMediaProcessing() {
  let provider; try { provider = processingProvider(processingConfig()); } catch { /* Provider operations fail closed. */ }
  return mediaProcessing(postgresMediaStore, environment(), () => new Date(), provider);
}
