import { randomUUID, createHash } from 'node:crypto';
import type { ApplicationInput } from './validation';

export function createApplicationReference(): string {
  return `WS-${randomUUID().replaceAll('-', '').slice(0, 20).toUpperCase()}`;
}
export function applicationPayloadHash(data: ApplicationInput): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}
