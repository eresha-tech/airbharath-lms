import { expect, it, vi } from 'vitest';
import { createDatabaseClient, databaseConfiguration } from '@/lib/db/configuration';
const local = 'postgresql://synthetic:synthetic@localhost:5433/airbharath_lms';
const remote = 'postgres://synthetic:synthetic@remote.example.invalid/catalog';
const config = (DATABASE_URL = local, more: Record<string, string | undefined> = {}, purpose: 'web' | 'worker' = 'web') => databaseConfiguration({ DATABASE_ENV: 'development', DATABASE_URL, ...more }, purpose);
it('keeps the exact local target on TCP by default with its configured identity', async () => {
  const c = config();
  expect(c).toMatchObject({ host: ['localhost'], port: [5433], database: 'airbharath_lms', user: 'synthetic', path: undefined, ssl: false });
  expect(await c.password!()).toBe('synthetic');
});
it('permits only an explicit /tmp socket opt-in for the exact local development target', () => {
  expect(config(local, { DATABASE_LOCAL_SOCKET_PATH: '/tmp' }).path).toBe('/tmp/.s.PGSQL.5433');
  for (const DATABASE_URL of [remote, local.replace('localhost', '127.0.0.1'), local.replace('5433', '5432'), local.replace('airbharath_lms', 'other')]) {
    expect(() => config(DATABASE_URL, { DATABASE_LOCAL_SOCKET_PATH: '/tmp' })).toThrow('database_configuration_invalid');
  }
  for (const more of [{ DATABASE_LOCAL_SOCKET_PATH: '/var/run/postgresql' }, { DATABASE_LOCAL_SOCKET_PATH: '/tmp', DATABASE_ENV: 'test' }, { DATABASE_LOCAL_SOCKET_PATH: '/tmp', DATABASE_ENV: 'production', NODE_ENV: 'production' }]) expect(() => config(local, more)).toThrow();
});
it.each([
  remote.replace('.invalid', '.invalid:5433'),
  remote.replace(':synthetic@', ':password5433@'),
  remote.replace('//synthetic:', '//user5433:'),
  remote.replace('/catalog', '/database5433'),
  remote + '?application_name=service5433',
  remote,
])('retains the configured remote target regardless of digits elsewhere: %s', url => {
  expect(config(url)).toMatchObject({ host: ['remote.example.invalid'], path: undefined, ssl: 'verify-full' });
  expect(config(url).port).toEqual([url.includes('.invalid:5433') ? 5433 : 5432]);
});
it('decodes credentials and database names once', async () => {
  const c = config('postgresql://user%40realm:pass%3A%40%2F%255433@remote.example.invalid/data%20base');
  expect(c.user).toBe('user@realm'); expect(await c.password!()).toBe('pass:@/%5433'); expect(c.database).toBe('data base');
});
it.each(['127.0.0.1', '[::1]', '[2001:db8::1]'])('handles IPv4/IPv6 without postgres.js colon splitting: %s', host => {
  const c = config(`postgresql://synthetic:synthetic@${host}:5433/catalog`);
  const sql = createDatabaseClient(c); // Lazy constructor only: no socket/query is opened.
  expect(sql.options.host).toEqual([host.replace(/^\[|\]$/g, '')]); expect(sql.options.port).toEqual([5433]);
});
it('passes the actual permitted socket path and explicit credentials to installed postgres.js', async () => {
  vi.stubEnv('PGHOST', 'ambient.example.invalid'); vi.stubEnv('PGPORT', '9999'); vi.stubEnv('PGPASSWORD', 'ambient-synthetic'); vi.stubEnv('PGSSL', 'disable'); vi.stubEnv('PGSSLNEGOTIATION', 'direct');
  const sql = createDatabaseClient(config(local.replace(':synthetic@', ':@'), { DATABASE_LOCAL_SOCKET_PATH: '/tmp' }));
  expect(sql.options.path).toBe('/tmp/.s.PGSQL.5433'); expect(sql.options.user).toBe('synthetic'); const pass: unknown = sql.options.pass; expect(typeof pass).toBe('function'); if (typeof pass === 'function') expect(await pass()).toBe(''); expect(sql.options.ssl).toBe(false);
});
it.each([undefined, '', 'not-a-url', 'https://private.example.invalid', 'postgres://synthetic@/catalog', 'postgres://synthetic@host', 'postgres://synthetic@host:99999/catalog', 'postgres://synthetic@host:0/catalog', 'postgres://synthetic@host/catalog#fragment', 'postgres://synthetic:secret%ZZ@host/catalog', 'postgres://synthetic@host/data%2Fother', 'postgres://synthetic@host/catalog?host=localhost', 'postgres://synthetic@host/catalog?sslmode=verify-full&sslmode=disable', 'postgres://synthetic@host/catalog?ssl=verify-full&sslmode=require', 'postgres://synthetic@host1,host2/catalog', 'postgres://synthetic@host/catalog?unsupported=5433'])('rejects missing/malformed/ambiguous production configuration without exposing it', DATABASE_URL => {
  const env = { NODE_ENV: 'production', DATABASE_ENV: 'production', DATABASE_URL };
  expect(() => databaseConfiguration(env)).toThrow('database_configuration_invalid');
});
it('rejects missing/contradictory environment or URL aliases', () => {
  expect(() => databaseConfiguration({ DATABASE_URL: remote })).toThrow();
  expect(() => config(remote, { DATABASE_ENV: 'development', NODE_ENV: 'production' })).toThrow();
  expect(() => config(local, { POSTGRES_URL: remote })).toThrow();
  expect(() => config('', { POSTGRES_URL: remote })).toThrow();
  expect(databaseConfiguration({ DATABASE_ENV: 'development', POSTGRES_URL: remote }).host).toEqual(['remote.example.invalid']);
});
it.each(['disable', 'allow', 'prefer', 'verify-ca', 'unknown'])('rejects unsafe remote TLS mode %s', sslmode => {
  expect(() => config(remote + '?sslmode=' + sslmode)).toThrow();
});
it('enforces certificate validation for TLS including require, and forbids production plaintext', () => {
  for (const suffix of ['', '?sslmode=require', '?sslmode=verify-full', '?sslmode=require&sslrootcert=system']) expect(config(remote + suffix).ssl).toBe('verify-full');
  expect(() => config(local + '?sslmode=disable', { DATABASE_ENV: 'production', NODE_ENV: 'production' })).toThrow();
  expect(config(local, { DATABASE_ENV: 'production', NODE_ENV: 'production' }).ssl).toBe('verify-full');
  expect(() => config(remote + '?sslrootcert=/private/path')).toThrow();
});
it('bounds pools for development, production and serial workers', () => {
  expect(config().max).toBe(5); expect(config(remote, { DATABASE_ENV: 'production' }).max).toBe(3); expect(config(local, {}, 'worker').max).toBe(1);
  expect(config(local, { DB_WEB_POOL_MAX: '10' }).max).toBe(10);
  for (const max of ['0', '11', '-1', 'Infinity', '1.5', '1e1', '']) expect(() => config(local, { DB_WEB_POOL_MAX: max })).toThrow();
  expect(() => config(local, { DB_WORKER_POOL_MAX: '2' }, 'worker')).toThrow();
  expect(() => config(local + '?max=2', {}, 'worker')).toThrow();
});
it('sets bounded timeouts with worker limits preserved and rejects disabling/inverted limits', () => {
  expect(config()).toMatchObject({ connect_timeout: 5, idle_timeout: 20, max_lifetime: 300, prepare: false, connection: { statement_timeout: 15000, lock_timeout: 2000, idle_in_transaction_session_timeout: 15000 } });
  expect(config(local, {}, 'worker')).toMatchObject({ idle_timeout: 5, connection: { statement_timeout: 5000, lock_timeout: 2000, idle_in_transaction_session_timeout: 5000 } });
  for (const more of [{ DB_CONNECT_TIMEOUT_SECONDS: '31' }, { DB_IDLE_TIMEOUT_SECONDS: '0' }, { DB_MAX_LIFETIME_SECONDS: '59' }, { DB_STATEMENT_TIMEOUT_MS: '0' }, { DB_LOCK_TIMEOUT_MS: '5001' }, { DB_STATEMENT_TIMEOUT_MS: '1000' }, { DB_IDLE_TRANSACTION_TIMEOUT_MS: '60001' }]) expect(() => config(local, more)).toThrow();
  expect(() => config(local, { DB_WORKER_STATEMENT_TIMEOUT_MS: '5001' }, 'worker')).toThrow();
});
it('retains supported bounded query options without allowing driver target overrides', () => {
  expect(config(remote + '?max=4&connect_timeout=6&idle_timeout=30&max_lifetime=120&statement_timeout=10000&lock_timeout=1000&application_name=job5433&default_transaction_read_only=on&target_session_attrs=read-only')).toMatchObject({ max: 4, connect_timeout: 6, idle_timeout: 30, max_lifetime: 120, target_session_attrs: 'read-only', connection: { application_name: 'job5433', statement_timeout: 10000, lock_timeout: 1000, default_transaction_read_only: true } });
  expect(() => config(remote + '?max=4', { DB_WEB_POOL_MAX: '3' })).toThrow();
  expect(() => config(remote + '?statement_timeout=0')).toThrow();
});
