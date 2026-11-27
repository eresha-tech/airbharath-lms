// Credential-isolated launcher helper for the explicitly authorized disposable Phase 2.0 test target.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomBytes}=require('node:crypto');
const {createLoader,req}=require('../tests/postgres/workspace-financial-loader.cjs');
function testEnvironment(){
 assert.notEqual(process.env.NODE_ENV,'production');assert.equal(process.env.WORKSPACE_PUBLISHING_LOCAL_TEST,'true');
 const sourceRoot=process.cwd();req('@next/env').loadEnvConfig(sourceRoot,true,{info(){},error(){}});
 const f=JSON.parse(fs.readFileSync('/tmp/phase20-browser-fixture.json'));
 f.root=fs.realpathSync(f.root);assert.match(f.root,/^\/tmp\/airbharath-media-pg-phase20-[A-Za-z0-9_-]+$/);assert.match(f.database,/^phase19b_[a-f0-9]{32}$/);
 const env={PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'development',DATABASE_ENV:'test',DATABASE_URL:`postgresql://phase19b@localhost:55440/${f.database}?sslmode=disable`,WORKSPACE_PUBLICATION_ENABLED:'true',NEXT_PUBLIC_BASE_URL:'http://localhost:3000',WORKSPACE_PAYMENT_ENABLED:'false',WORKSPACE_REFUND_ENABLED:'false',WORKSPACE_RAZORPAY_WEBHOOK_ENABLED:'false',WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED:'false',WORKSPACE_NOTICE_DELIVERY_ENABLED:'false',WORKSPACE_EMAIL_VERIFICATION_ENABLED:'false',NEXT_PUBLIC_POSTHOG_ENABLE_DEV:'false'};
 for(const [key,value]of Object.entries(process.env))if(key.startsWith('WORKSPACE_MEDIA_')&&typeof value==='string')env[key]=value;
 const c=createLoader({'server-only':{}})('@/lib/workspace/media/processing-provider').processingConfig(env);
 // This is the founder-approved test account/bucket/role, never the LMS AWS target.
 assert.equal(c.accountId,'137068239266');assert.equal(c.bucket,'airbharath-workspace-uat-dev01');assert.equal(c.region,'ap-south-1');assert.equal(c.role,'arn:aws:iam::137068239266:role/LMSMediaConvertTestRole');assert.equal(c.queue,'arn:aws:mediaconvert:ap-south-1:137068239266:queues/Default');assert.notEqual(c.accessKeyId,process.env.AWS_ACCESS_KEY_ID);
 // Runtime-only session seed is kept in a 0600 file outside the repository.
 const file=path.join(f.root,'phase20-session-seed');if(!fs.existsSync(file))fs.writeFileSync(file,randomBytes(48).toString('hex'),{mode:0o600});env.JWT_SECRET=fs.readFileSync(file,'utf8');
 return {env,f,req,createLoader};
}
async function connection(t){const p=t.req('postgres')({host:path.join(t.f.root,'socket'),port:55439,user:'phase19b',database:t.f.database,max:1,prepare:false,onnotice(){}});const [i]=await p`select current_setting('data_directory') directory,inet_server_addr() address,current_database() database`;assert.equal(fs.realpathSync(i.directory),path.join(t.f.root,'data'));assert.equal(i.address,null);assert.equal(i.database,t.f.database);return p;}
module.exports={testEnvironment,connection};
