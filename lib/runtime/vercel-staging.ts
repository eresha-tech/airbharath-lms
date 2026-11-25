import { createDatabaseClient, databaseConfiguration } from '@/lib/db/configuration';
import { assertVercelStagingIdentity, vercelStagingConfiguration } from './vercel-staging-core.mjs';

export async function verifyVercelStagingDatabase() {
  const expected = vercelStagingConfiguration(); // Reject before constructing a connection.
  const sql = createDatabaseClient({ ...databaseConfiguration(process.env, 'web', 'airbharath_preview_identity'), max: 1 });
  try {
    const [row] = await sql`select environment, identity, current_database() as database, current_user as role,
      session_user as authenticated_role,
      (select pg_get_userbyid(relowner) from pg_class where oid='deployment_guard.runtime_identity'::regclass) as marker_owner,
      has_table_privilege(current_user,'deployment_guard.runtime_identity','INSERT,UPDATE,DELETE,TRUNCATE') as marker_writable,
      pg_has_role(current_user,(select relowner from pg_class where oid='deployment_guard.runtime_identity'::regclass),'MEMBER') as marker_owner_member,
      (select rolcanlogin and not (rolinherit or rolsuper or rolcreatedb or rolcreaterole or rolreplication or rolbypassrls) from pg_roles where rolname=current_user) as restricted,
      (select count(*)::int from pg_auth_members where member=current_user::regrole) as parents,
      (select count(*)::int from pg_class where relowner=current_user::regrole) as owns,
      (select not rolcanlogin from pg_roles where rolname='airbharath_staging_migrator') as migrator_nologin,
      (select count(*)::int from drizzle.__drizzle_migrations) as migrations
      from deployment_guard.runtime_identity where singleton=true`;
    assertVercelStagingIdentity(row, expected);
  } catch {
    // Do not let driver errors serialize credentials or private connection options.
    throw new Error('vercel_staging_database_identity_rejected');
  } finally { await sql.end({ timeout: 3 }); }
}
