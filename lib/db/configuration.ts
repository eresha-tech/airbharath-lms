import { isIP } from 'node:net';
import postgres from 'postgres';

export type DatabaseConfiguration = Omit<postgres.Options<Record<string, postgres.PostgresType>>, 'host' | 'port' | 'password'> & { host: string[]; port: number[]; password: () => string; sslnegotiation: null };

export function createDatabaseClient(options: DatabaseConfiguration) {
  // postgres.js 3.4.9 accepts host/port arrays (and uses them internally), but Options narrows them incorrectly.
  return postgres(options as unknown as postgres.Options<Record<string, postgres.PostgresType>>);
}

type Environment = Record<string, string | undefined>;
type Purpose = 'web' | 'worker';

// Parse before constructing a driver: never let postgres.js infer a target from PG* or OS defaults.
export function databaseConfiguration(env: Environment, purpose: Purpose = 'web', applicationName = 'airbharath_web'): DatabaseConfiguration {
  const invalid = (): never => { throw new Error('database_configuration_invalid'); };
  if (!['development', 'test', 'staging', 'production'].includes(env.DATABASE_ENV ?? '')) invalid();
  const production = env.NODE_ENV === 'production' || ['staging', 'production'].includes(env.DATABASE_ENV!);
  if (env.NODE_ENV === 'production' && !['staging', 'production'].includes(env.DATABASE_ENV!)) invalid();
  const value = env.DATABASE_URL ?? env.POSTGRES_URL;
  if (!value || value.trim() !== value || /[\s\\]/.test(value)) invalid();
  if (env.DATABASE_URL !== undefined && env.POSTGRES_URL !== undefined && env.DATABASE_URL !== env.POSTGRES_URL) invalid();
  let url: URL;
  try { url = new URL(value!); } catch { return invalid(); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hash || !url.hostname || !url.username) invalid();
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!isIP(host) && !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host)) invalid();
  let user: string, password: string, database: string;
  try {
    user = decodeURIComponent(url.username); password = decodeURIComponent(url.password); database = decodeURIComponent(url.pathname.slice(1));
  } catch { return invalid(); }
  if (!user || !database || /[\u0000-\u001f\u007f]/.test(user + password + database) || /[/\\]/.test(database)) invalid();
  const port = url.port ? Number(url.port) : 5432;
  if (!Number.isInteger(port) || port < 1 || port > 65535) invalid();
  const query = new Map<string, string>();
  const supported = new Set(['sslmode', 'ssl', 'sslrootcert', 'target_session_attrs', 'application_name', 'max', 'connect_timeout', 'idle_timeout', 'max_lifetime', 'statement_timeout', 'lock_timeout', 'idle_in_transaction_session_timeout', 'default_transaction_read_only']);
  for (const [key, entry] of url.searchParams) {
    if (!supported.has(key) || query.has(key)) invalid();
    query.set(key, entry);
  }
  if (query.has('sslmode') && query.has('ssl')) invalid();
  if (query.has('sslrootcert') && query.get('sslrootcert') !== 'system') invalid();
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(host);
  const socket = env.DATABASE_LOCAL_SOCKET_PATH;
  if (socket !== undefined && (socket !== '/tmp' || production || env.DATABASE_ENV !== 'development' || host !== 'localhost' || port !== 5433 || database !== 'airbharath_lms')) invalid();
  const ssl = query.get('sslmode') ?? query.get('ssl') ?? (loopback && !production ? 'disable' : 'verify-full');
  if (!['disable', 'false', 'require', 'verify-full', 'true'].includes(ssl)) invalid();
  if (['disable', 'false'].includes(ssl) && (!loopback || production || query.has('sslrootcert'))) invalid();
  if (socket && !['disable', 'false'].includes(ssl)) invalid();

  function bounded(key: string, fallback: number, min: number, max: number, queryKey?: string) {
    const supplied = env[key], fromUrl = queryKey ? query.get(queryKey) : undefined;
    if (supplied !== undefined && fromUrl !== undefined && supplied !== fromUrl) invalid();
    const raw = supplied ?? fromUrl;
    if (raw !== undefined && !/^[1-9]\d*$/.test(raw)) invalid();
    const number = raw === undefined ? fallback : Number(raw);
    if (!Number.isSafeInteger(number) || number < min || number > max) invalid();
    return number;
  }
  const worker = purpose === 'worker';
  const statement = bounded(worker ? 'DB_WORKER_STATEMENT_TIMEOUT_MS' : 'DB_STATEMENT_TIMEOUT_MS', worker ? 5000 : 15000, 1000, worker ? 5000 : 60000, 'statement_timeout');
  const lock = bounded(worker ? 'DB_WORKER_LOCK_TIMEOUT_MS' : 'DB_LOCK_TIMEOUT_MS', 2000, 100, worker ? 2000 : 5000, 'lock_timeout');
  if (lock > statement) invalid();
  const readOnly = query.get('default_transaction_read_only') ?? 'off';
  if (!['on', 'off'].includes(readOnly)) invalid();
  const session = query.get('target_session_attrs') ?? (readOnly === 'on' ? 'read-only' : 'read-write');
  if (!['read-write', 'read-only', 'primary', 'standby', 'prefer-standby'].includes(session)) invalid();
  const name = query.get('application_name') ?? applicationName;
  if (!/^[a-zA-Z0-9_.-]{1,63}$/.test(name)) invalid();
  return {
    // Arrays prevent postgres.js's string host:port parser from splitting IPv6 addresses.
    host: [host], port: [port], path: socket ? `${socket}/.s.PGSQL.${port}` : undefined, database, user,
    // A function also prevents an empty configured password falling through to PGPASSWORD.
    password: () => password,
    ssl: ['disable', 'false'].includes(ssl) ? false : 'verify-full', sslnegotiation: null,
    max: bounded(worker ? 'DB_WORKER_POOL_MAX' : 'DB_WEB_POOL_MAX', worker ? 1 : production ? 3 : 5, 1, worker ? 1 : 10, 'max'),
    prepare: false, debug: false, fetch_types: true,
    connect_timeout: bounded('DB_CONNECT_TIMEOUT_SECONDS', 5, 1, 30, 'connect_timeout'),
    idle_timeout: bounded(worker ? 'DB_WORKER_IDLE_TIMEOUT_SECONDS' : 'DB_IDLE_TIMEOUT_SECONDS', worker ? 5 : 20, 1, worker ? 60 : 300, 'idle_timeout'),
    max_lifetime: bounded('DB_MAX_LIFETIME_SECONDS', 300, 60, 1800, 'max_lifetime'),
    target_session_attrs: session as 'read-write' | 'read-only' | 'primary' | 'standby' | 'prefer-standby',
    onnotice: () => {},
    connection: {
      application_name: name,
      statement_timeout: statement,
      lock_timeout: lock,
      idle_in_transaction_session_timeout: bounded(worker ? 'DB_WORKER_IDLE_TRANSACTION_TIMEOUT_MS' : 'DB_IDLE_TRANSACTION_TIMEOUT_MS', worker ? 5000 : 15000, 1000, worker ? 5000 : 60000, 'idle_in_transaction_session_timeout'),
      default_transaction_read_only: readOnly === 'on',
    },
  };
}
