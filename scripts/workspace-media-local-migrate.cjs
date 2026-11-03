const fs=require('node:fs'),path=require('node:path');
const {localTarget}=require('./workspace-local-target.cjs');
(async()=>{let c;try{
 const target=await localTarget({write:true});c=target.client;
 const {assertDatabaseMigration}=await import('./database-safety.mjs');assertDatabaseMigration({databaseEnv:target.env.DATABASE_ENV,databaseUrl:target.env.DATABASE_URL,acknowledgement:target.env.ALLOW_DATABASE_MIGRATION});
 const {loadReviewedSource}=await import('./database-readonly-preflight-core.mjs');const source=loadReviewedSource(target.root);if(source.manifest.length!==36)throw Error('unexpected_migration_head');
 const rows=await c`select hash,created_at from drizzle.__drizzle_migrations order by created_at`;
 if(rows.length<32||rows.length>36||!rows.every((r,i)=>r.hash===source.manifest[i].sha256&&Number(r.created_at)===source.manifest[i].when))throw Error('local_ledger_mismatch');
 const tables=['courses','lessons','videos','enrollments','workspace_membership_orders'];
 async function fingerprints(){const result={};for(const t of tables){const [r]=await c.unsafe(`select count(*)::int as count,md5(coalesce(string_agg((to_jsonb(t)-ARRAY['workspace_project_id','workspace_state','workspace_revision_id','workspace_retired','content_format'])::text,'|' order by id),'')) as digest from "${t}" t`);result[t]=r;}return result;}
 const before=await fingerprints(),{drizzle}=target.req('drizzle-orm/postgres-js'),{migrate}=target.req('drizzle-orm/postgres-js/migrator');
 await migrate(drizzle(c),{migrationsFolder:path.join(target.root,'drizzle')});await migrate(drizzle(c),{migrationsFolder:path.join(target.root,'drizzle')});
 const after=await fingerprints();if(JSON.stringify(before)!==JSON.stringify(after))throw Error('historical_data_changed');
 const report={localIdentityVerified:true,from:rows.length,to:(await c`select count(*)::int n from drizzle.__drizzle_migrations`)[0].n,repeatNoop:true,historicalRowsPreserved:true};
 const dir=path.join(target.root,'output/audits/workspace-phase19-local');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'migration.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await c?.end({timeout:2});}})().catch(e=>{console.error('Local migration refused/failed ('+(/^[A-Za-z0-9_]+$/.test(e.code||'')?e.code:'guard_or_verification')+'); private details suppressed.');process.exitCode=1;});
