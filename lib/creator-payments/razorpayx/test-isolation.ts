import 'server-only';
import { createHash } from 'node:crypto';
import { constants, closeSync, fstatSync, openSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { sql } from 'drizzle-orm';
import type { db } from '@/lib/db';
import { databaseConfiguration } from '@/lib/db/configuration';
import { CommerceError } from '@/lib/commerce/model';
import type { PayoutConfig } from './config';

type TestScope = {
    version: 1; runId: string; expiresAt: string; credentialHash: string; merchantId: string;
    fundingFingerprint: string; databaseUrlHash: string; systemIdentifier: string;
    databaseOid: string; databaseName: string; databaseUser: string;
};
const scopes = new WeakMap<PayoutConfig, { proof: TestScope; verified: boolean; address: string; port: number }>();
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
function blocked(): never { throw new CommerceError(503, 'Dedicated isolated RazorpayX Test authorization and database evidence required.'); }
function actualRuntime() {
    if (process.env.NODE_ENV === 'production' || ['staging', 'production'].includes(process.env.DATABASE_ENV ?? '')
        || ['VERCEL_ENV', 'VERCEL_TARGET_ENV'].some(key => process.env[key] === 'production')) blocked();
}
function testMode(config: PayoutConfig) {
    if (config.mode === 'live' && /^rzp_live_[A-Za-z0-9]+$/.test(config.keyId)) return false;
    if (config.mode !== 'test' || !/^rzp_test_[A-Za-z0-9]+$/.test(config.keyId)) blocked();
    actualRuntime();
    return true;
}
function current(proof: TestScope) {
    const remaining = Date.parse(proof.expiresAt) - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0 || remaining > 4 * 60 * 60 * 1000) blocked();
}
// A protected, independently reviewed run record is distinct from the selected credentials/URL.
// No application path generates or self-approves it; database identity is checked again below.
export function bindPayoutTestScope(config: PayoutConfig, env: Record<string, string | undefined>) {
    actualRuntime();
    if (env.RAZORPAYX_TEST_AUTHORIZED !== 'true') blocked();
    const file = env.RAZORPAYX_TEST_SCOPE_FILE;
    if (!file || !isAbsolute(file)) blocked();
    let proof: TestScope;
    try {
        const parent = statSync(dirname(file));
        if (parent.uid !== process.getuid?.() || (parent.mode & 0o777) !== 0o700) blocked();
        const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
        try {
            const st = fstatSync(fd);
            if (!st.isFile() || st.uid !== process.getuid?.() || (st.mode & 0o777) !== 0o600 || st.size > 8192) blocked();
            proof = JSON.parse(readFileSync(fd, 'utf8')) as TestScope;
        } finally { closeSync(fd); }
        if (proof.version !== 1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(proof.runId)
            || proof.credentialHash !== sha(config.keyId + ':' + config.secret) || proof.merchantId !== config.merchantId
            || proof.fundingFingerprint !== config.fingerprint || proof.databaseUrlHash !== sha(env.DATABASE_URL ?? env.POSTGRES_URL ?? '')
            || !/^\d{16,20}$/.test(proof.systemIdentifier) || !/^[1-9]\d{0,9}$/.test(proof.databaseOid)
            || !/^airbharath_test_[a-z0-9_]{1,40}$/.test(proof.databaseName) || !/^[a-z_][a-z0-9_]{0,62}$/.test(proof.databaseUser)) blocked();
        current(proof);
        const options = databaseConfiguration(env);
        if (options.host.length !== 1 || !['127.0.0.1', '::1'].includes(options.host[0]) || options.path
            || options.database !== proof.databaseName || options.user !== proof.databaseUser) blocked();
        scopes.set(config, { proof: Object.freeze(proof), verified: false, address: options.host[0], port: options.port[0] });
    } catch { blocked(); }
}
export async function verifyPayoutTestDatabase(database: Pick<typeof db, 'execute'>, config: PayoutConfig) {
    if (!testMode(config)) return;
    const scope = scopes.get(config);
    if (!scope) blocked();
    scope.verified = false;
    current(scope.proof);
    try {
        // Read-only identity evidence from the actual supplied connection, not a boolean env claim.
        const rows = await database.execute(sql`select current_database() database_name, current_user database_user,
            (select oid::text from pg_catalog.pg_database where datname=current_database()) database_oid,
            (select system_identifier::text from pg_catalog.pg_control_system()) system_identifier,
            pg_catalog.host(inet_server_addr()) address, inet_server_port() port`);
        const row = rows[0];
        if (rows.length !== 1 || row.database_name !== scope.proof.databaseName || row.database_user !== scope.proof.databaseUser
            || row.database_oid !== scope.proof.databaseOid || row.system_identifier !== scope.proof.systemIdentifier
            || row.address !== scope.address || row.port !== scope.port) blocked();
        current(scope.proof);
        scope.verified = true;
    } catch { blocked(); }
}
export function requirePayoutTestDatabase(config: PayoutConfig) {
    if (!testMode(config)) return;
    const scope = scopes.get(config);
    if (!scope || !scope.verified) blocked();
    current(scope.proof);
}
