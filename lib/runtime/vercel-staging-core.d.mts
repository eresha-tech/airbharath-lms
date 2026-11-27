export const PREVIEW_DISABLED_FLAGS: string[];
export interface PreviewIdentity { host: string; database: string; user: string; identity: string; }
export function vercelPreviewRequested(env?: Record<string, string | undefined>): boolean;
export function vercelStagingConfiguration(env?: Record<string, string | undefined>): PreviewIdentity;
export function vercelStagingAuthorized(env?: Record<string, string | undefined>): boolean;
export function assertVercelStagingIdentity(row: unknown, expected: PreviewIdentity): void;
