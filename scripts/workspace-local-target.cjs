// One pinned local-only authority for founder setup tools; no ambient DB targets.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..');
function environment(){createRequire(require.resolve('next/package.json'))('@next/env').loadEnvConfig(root,true,{info(){},error(){}});return process.env;}
async function localTarget({write=false}={}){
 const env=environment();
 if(env.NODE_ENV==='production'||env.DATABASE_ENV!=='development'||['VERCEL','VERCEL_ENV','VERCEL_TARGET_ENV'].some(k=>env[k]!==undefined))throw Error('local_environment_required');
 const {createLoader,req}=require('../tests/postgres/workspace-financial-loader.cjs');
 const {databaseConfiguration,createDatabaseClient}=createLoader()('@/lib/db/configuration'),options=databaseConfiguration(env);
 if(!['localhost','127.0.0.1','::1'].includes(options.host[0])||options.port[0]!==5433||options.database!=='airbharath_lms')throw Error('local_target_refused');
 const client=createDatabaseClient({...options,max:1,target_session_attrs:write?'read-write':'read-only',connection:{...options.connection,default_transaction_read_only:write?'off':'on'}});
 try{
  const [r]=await client`select current_database() as database,(select oid::text from pg_database where datname=current_database()) as oid,(select system_identifier::text from pg_control_system()) as system_identifier,current_setting('data_directory') as directory,current_setting('port') as port,inet_server_addr() as address`;
  if(r.database!=='airbharath_lms'||r.oid!=='16384'||r.system_identifier!=='7680462735222304705'||r.port!=='5433'||r.address!==null&&!['127.0.0.1','::1'].includes(r.address)||fs.realpathSync(r.directory)!==fs.realpathSync(path.join(root,'.postgres_data')))throw Error('local_identity_refused');
  return {client,env,root,createLoader,req,identityVerified:true};
 }catch(e){await client.end({timeout:2});throw e;}
}
module.exports={localTarget,environment,root};
