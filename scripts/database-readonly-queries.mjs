// Fixed SELECT-only catalog queries. Never accept caller SQL or invoke application routines.
export const queries = Object.freeze({
  identity: `select current_database() as database, (select oid::text from pg_catalog.pg_database where datname=current_database()) as oid,
    current_user as role, session_user as authenticated_role, current_setting('server_version') as version,
    pg_catalog.host(pg_catalog.inet_server_addr()) as server_address, pg_catalog.inet_server_port() as port,
    current_setting('search_path') as search_path, current_setting('transaction_read_only') as read_only, pg_catalog.pg_is_in_recovery() as recovery,
    (select setting::int from pg_catalog.pg_settings where name='statement_timeout') as statement_timeout_ms,
    (select setting::int from pg_catalog.pg_settings where name='lock_timeout') as lock_timeout_ms,
    (select setting::int from pg_catalog.pg_settings where name='idle_in_transaction_session_timeout') as idle_transaction_timeout_ms`,
  tls: `select ssl,version,cipher,bits from pg_catalog.pg_stat_ssl where pid=pg_catalog.pg_backend_pid()`,
  roles: `with accessible as (select * from pg_catalog.pg_roles where rolname=current_user or pg_catalog.pg_has_role(current_user,oid,'MEMBER'))
    select (select bool_or(rolsuper or rolcreatedb or rolcreaterole or rolreplication or rolbypassrls) from accessible) as elevated,
    exists(select 1 from accessible r join pg_catalog.pg_class c on c.relowner=r.oid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema') as owns_objects,
    exists(select 1 from accessible r join pg_catalog.pg_proc p on p.proowner=r.oid join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema') as owns_routines,
    exists(select 1 from accessible r cross join pg_catalog.pg_namespace n where n.nspname !~ '^pg_' and n.nspname<>'information_schema' and pg_catalog.has_schema_privilege(r.oid,n.oid,'CREATE')) as schema_create,
    exists(select 1 from accessible r cross join pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema' and c.relkind in ('r','p','v','m','f') and pg_catalog.has_table_privilege(r.oid,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER')) as table_write,
    exists(select 1 from accessible r cross join pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema' and c.relkind='S' and pg_catalog.has_sequence_privilege(r.oid,c.oid,'USAGE,UPDATE')) as sequence_write,
    exists(select 1 from accessible r where pg_catalog.has_database_privilege(r.oid,current_database(),'CREATE')) as database_create,
    pg_catalog.has_database_privilege(current_user,current_database(),'TEMP') as temporary_objects,
    exists(select 1 from pg_catalog.pg_roles where rolname=$1) as migration_role_exists,
    exists(select 1 from accessible where rolname=$1) as migration_role_accessible`,
  schemas: `select nspname as name,pg_catalog.pg_get_userbyid(nspowner) as owner from pg_catalog.pg_namespace where nspname !~ '^pg_' and nspname<>'information_schema' order by 1 limit 101`,
  objects: `select n.nspname as schema,c.relname as name,c.relkind as kind,pg_catalog.pg_get_userbyid(c.relowner) as owner,c.relrowsecurity as rls
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname !~ '^pg_' and n.nspname<>'information_schema' order by 1,2 limit 2001`,
  columns: `select n.nspname as schema,c.relname as table,a.attname as name,pg_catalog.format_type(a.atttypid,a.atttypmod) as type,
    a.attnotnull as not_null,pg_catalog.pg_get_expr(d.adbin,d.adrelid) as default_definition
    from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid=a.attrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    left join pg_catalog.pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
    where n.nspname='public' and c.relkind in ('r','p') and a.attnum>0 and not a.attisdropped order by 1,2,a.attnum limit 10001`,
  constraints: `select n.nspname as schema,c.relname as table,k.conname as name,k.contype as type,k.convalidated as validated,
    k.condeferrable as deferrable,k.condeferred as deferred,pg_catalog.pg_get_constraintdef(k.oid,true) as definition,
    array(select a.attname from unnest(k.conkey) with ordinality x(num,pos) join pg_catalog.pg_attribute a on a.attrelid=c.oid and a.attnum=x.num order by x.pos) as columns,
    rn.nspname as foreign_schema,rc.relname as foreign_table,
    array(select a.attname from unnest(k.confkey) with ordinality x(num,pos) join pg_catalog.pg_attribute a on a.attrelid=rc.oid and a.attnum=x.num order by x.pos) as foreign_columns,
    k.confdeltype as delete_action,k.confupdtype as update_action
    from pg_catalog.pg_constraint k join pg_catalog.pg_class c on c.oid=k.conrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    left join pg_catalog.pg_class rc on rc.oid=k.confrelid left join pg_catalog.pg_namespace rn on rn.oid=rc.relnamespace
    where n.nspname='public' order by 1,2,3 limit 2001`,
  indexes: `select n.nspname as schema,c.relname as table,idx.relname as name,i.indisvalid as valid,i.indisready as ready,
    i.indisunique as unique,pg_catalog.pg_get_indexdef(i.indexrelid) as definition
    from pg_catalog.pg_index i join pg_catalog.pg_class c on c.oid=i.indrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    join pg_catalog.pg_class idx on idx.oid=i.indexrelid where n.nspname='public' order by 1,2,3 limit 2001`,
  functions: `select n.nspname as schema,p.proname as name,pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
    l.lanname as language,p.prosecdef as security_definer,p.prosrc as body,pg_catalog.pg_get_functiondef(p.oid) as definition
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace join pg_catalog.pg_language l on l.oid=p.prolang
    where n.nspname='public' and p.prokind='f' order by 1,2,3 limit 1001`,
  triggers: `select n.nspname as schema,c.relname as table,t.tgname as name,t.tgenabled as enabled,t.tgtype as type,
    pn.nspname as function_schema,p.proname as function,t.tgdeferrable as deferrable,t.tginitdeferred as deferred,
    pg_catalog.pg_get_triggerdef(t.oid,true) as definition
    from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    join pg_catalog.pg_proc p on p.oid=t.tgfoid join pg_catalog.pg_namespace pn on pn.oid=p.pronamespace
    where not t.tgisinternal and n.nspname='public' order by 1,2,3 limit 1001`,
  enums: `select n.nspname as schema,t.typname as name,array_agg(e.enumlabel order by e.enumsortorder) as values from pg_catalog.pg_enum e join pg_catalog.pg_type t on t.oid=e.enumtypid join pg_catalog.pg_namespace n on n.oid=t.typnamespace where n.nspname='public' group by 1,2 order by 1,2 limit 101`,
  ledgerPresence: `select pg_catalog.to_regclass('drizzle.__drizzle_migrations') is not null as present`,
  populated: `select exists(select 1 from public.users limit 1) as populated`,
  ledger: `select id,hash,created_at::text as created_at from drizzle.__drizzle_migrations order by created_at,id limit 33`,
  terms: `select exists(select 1 from public.workspace_creator_terms_versions where terms_version='workspace_creator_terms_2026_01'
    and content_hash='7263f236cc1b27df8f95ef69a2dcc706981ec2060d58758f788bfe40f6808bac' and effective_at='2026-10-12T00:00:00.000Z'::timestamptz and is_current) as ready`,
  pricing: `select (select count(*)=3 from public.workspace_membership_plans where is_current)
    and not exists(select 1 from public.workspace_membership_plans where (code='quarterly' and version>4) or (code in ('half_yearly','yearly') and version>1)
      or id in ('14000000-0000-4000-8000-000000000004','14000000-0000-4000-8000-000000000005','14000000-0000-4000-8000-000000000006'))
    and not exists(select 1 from (values ('14000000-0000-4000-8000-000000000001'::uuid,'quarterly','Quarterly',3,499900),
      ('14000000-0000-4000-8000-000000000002'::uuid,'half_yearly','Half-Yearly',6,899900),('14000000-0000-4000-8000-000000000003'::uuid,'yearly','Yearly',12,1699900))
      as e(id,code,display_name,duration_months,base_price_paise) left join public.workspace_membership_plans p on p.id=e.id
      where p.id is null or p.code<>e.code or p.version<>1 or p.display_name<>e.display_name or p.duration_months<>e.duration_months or p.base_price_paise<>e.base_price_paise
        or p.tax_rate_bps<>1800 or p.currency<>'INR' or not p.is_current or not p.available) as ready`,
  emailPrerequisite: `select exists(select 1 from pg_catalog.pg_attribute where attrelid=pg_catalog.to_regclass('public.users') and attname='email' and atttypid='text'::regtype and not attisdropped) as ready`,
  capacity: `select name,setting from pg_catalog.pg_settings where name in ('max_connections','superuser_reserved_connections','reserved_connections') order by name`,
  activity: `select state,wait_event_type,count(*)::int as connections from pg_catalog.pg_stat_activity where datname=current_database() group by 1,2 order by 1,2`,
  serverIdentifier: `select system_identifier::text as system_identifier from pg_catalog.pg_control_system()`,
});
