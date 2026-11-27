// Starts only the disposable fixture produced by self-publishing-isolated-postgres.cjs.
// No existing founder DB or ambient provider credentials are used. The explicit
// media opt-in below reads only the pinned, authorized nonproduction Workspace config.
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),{spawn}=require('node:child_process'),{randomBytes}=require('node:crypto'),assert=require('node:assert/strict');
const {req}=require('../tests/postgres/workspace-financial-loader.cjs');
if(process.env.SELF_PUBLISHING_LOCAL_TEST!=='true')throw Error('SELF_PUBLISHING_LOCAL_TEST=true required.');
const f=JSON.parse(fs.readFileSync('/tmp/airbharath-self-publishing/fixture.json'));const root=fs.realpathSync(f.root);assert.match(root,/^\/tmp\/airbharath-media-pg-self-publishing-[A-Za-z0-9_-]+$/);assert.match(f.database,/^phase19b_[a-f0-9]{32}$/);
const source='/tmp/airbharath-self-publishing/source';assert(!fs.readdirSync(source).some(x=>x.startsWith('.env')));
(async()=>{
 const c=req('postgres')({host:path.join(root,'socket'),port:55439,database:f.database,user:'phase19b',max:1,prepare:false});
 const [identity]=await c`select current_setting('data_directory') directory,inet_server_addr() address`;assert.equal(fs.realpathSync(identity.directory),root+'/data');assert.equal(identity.address,null);await c.end();
 const file=root+'/self-publishing-test-seed';if(!fs.existsSync(file))fs.writeFileSync(file,randomBytes(48).toString('hex'),{mode:0o600});const seed=fs.readFileSync(file,'utf8');
 // Source-copy-only provider adapter. Shipping application code contains no
 // test-payment switch or authentication bypass. Checkout stays real HTTP + SQL.
 fs.writeFileSync(source+'/lib/razorpay.ts',`import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';import { orders } from '@/lib/db/schema';import { eq } from 'drizzle-orm';
export const razorpay = {
 orders: { create: async (o:{amount:number;currency:string})=>({id:'order_'+randomUUID().replaceAll('-',''),amount:o.amount,currency:o.currency}), fetchPayments:async(orderId:string)=>{const order=await db.query.orders.findFirst({where:eq(orders.razorpayOrderId,orderId)});return {items:order?[{id:'pay_'+orderId.slice(6),order_id:orderId,amount:Math.round(Number(order.amount)*100),currency:'INR',status:'captured',amount_refunded:0}]:[]};} },
 payments: { fetch: async (id:string)=>{if(!/^pay_[a-f0-9]{32}$/.test(id))throw Error('synthetic_payment_only');const orderId='order_'+id.slice(4);const order=await db.query.orders.findFirst({where:eq(orders.razorpayOrderId,orderId)});if(!order)throw Error('synthetic_order_missing');return {id,order_id:orderId,amount:Math.round(Number(order.amount)*100),currency:'INR',status:'captured',amount_refunded:0};} }
};`);
 fs.writeFileSync(source+'/lib/invoice-generator.ts',"export async function generateAndSaveInvoice(_id:string){return undefined;}\n");
 const proxy=net.createServer(client=>{const upstream=net.createConnection(root+'/socket/.s.PGSQL.55439');client.pipe(upstream);upstream.pipe(client);client.on('error',()=>upstream.destroy());upstream.on('error',()=>client.destroy());});
 await new Promise((resolve,reject)=>{proxy.once('error',reject);proxy.listen(55443,'127.0.0.1',resolve);});
 const env={PATH:process.env.PATH,HOME:process.env.HOME,NODE_OPTIONS:'--max-old-space-size=4096',NODE_ENV:'development',DATABASE_ENV:'test',DATABASE_URL:`postgresql://phase19b@127.0.0.1:55443/${f.database}?sslmode=disable`,JWT_SECRET:seed,RAZORPAY_KEY_SECRET:seed,NEXT_PUBLIC_RAZORPAY_KEY_ID:'rzp_test_synthetic_policy',NEXT_PUBLIC_BASE_URL:'http://localhost:3000',WORKSPACE_PUBLICATION_ENABLED:'true',WORKSPACE_PAYMENT_ENABLED:'false',WORKSPACE_NOTICE_DELIVERY_ENABLED:'false',NEXT_PUBLIC_POSTHOG_ENABLE_DEV:'false',NEXT_TELEMETRY_DISABLED:'1'};
 if(process.env.SELF_PUBLISHING_TEST_MEDIA==='true'){
  req('@next/env').loadEnvConfig(process.cwd(),true,{info(){},error(){}});
  const {createLoader}=require('../tests/postgres/workspace-financial-loader.cjs');const config=createLoader({'server-only':{}})('@/lib/workspace/media/provider').mediaStorageConfig();
  assert.equal(config.accountId,'137068239266');assert.equal(config.bucket,'airbharath-workspace-uat-dev01');assert.equal(config.region,'ap-south-1');assert.notEqual(config.accessKeyId,process.env.AWS_ACCESS_KEY_ID);
  const processing=createLoader({'server-only':{}})('@/lib/workspace/media/processing-provider').processingConfig();assert.equal(processing.accountId,config.accountId);assert.equal(processing.bucket,config.bucket);assert.equal(processing.role,'arn:aws:iam::137068239266:role/LMSMediaConvertTestRole');assert.equal(processing.queue,'arn:aws:mediaconvert:ap-south-1:137068239266:queues/Default');
  for(const [key,value] of Object.entries(process.env))if(key.startsWith('WORKSPACE_MEDIA_')&&typeof value==='string')env[key]=value;
 }
 const cache=path.resolve('output/audits/workspace-self-publishing/dev-next');fs.mkdirSync(cache,{recursive:true});if(!fs.existsSync(source+'/.next'))fs.symlinkSync(cache,source+'/.next','dir');assert.equal(fs.realpathSync(source+'/.next'),cache);
 env.WORKSPACE_MEDIA_WORKER_SECRET=randomBytes(32).toString('hex');
 const next=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3000'],{cwd:source,env,stdio:'inherit'});
 const worker=process.env.SELF_PUBLISHING_TEST_MEDIA==='true'?spawn(process.execPath,['scripts/workspace-media-local-worker.mjs'],{cwd:process.cwd(),env:{...env,DATABASE_ENV:'development',WORKSPACE_MEDIA_LOCAL_WORKER_ENABLED:'true',WORKSPACE_MEDIA_LOCAL_APP_URL:'http://localhost:3000'},stdio:'inherit'}):null;
 const stop=()=>{worker?.kill('SIGTERM');next.kill('SIGTERM');proxy.close();};process.on('SIGINT',stop);process.on('SIGTERM',stop);next.on('exit',()=>{worker?.kill('SIGTERM');proxy.close();});
})().catch(e=>{console.error('Isolated self-publishing server failed: '+(e.code||e.name));process.exitCode=1;});
