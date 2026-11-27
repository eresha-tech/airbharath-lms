// Stage2A writes only to the explicitly authorized, identity-checked synthetic DB.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID,createHash,createHmac}=require('node:crypto');
const {req,createLoader}=require('./workspace-financial-loader.cjs');
assert.equal(process.env.STAGE2A_POSTGRES,'true');assert.equal(process.env.DATABASE_ENV,'test');assert.equal(process.env.ALLOW_DESTRUCTIVE_DB_OPERATION,'true');assert.equal(process.env.DATABASE_URL,undefined);
const out=path.resolve('output/audits/workspace-stage2a'),f=JSON.parse(fs.readFileSync('/tmp/airbharath-stage2a/fixture.json'));
assert.equal(path.dirname(fs.realpathSync(f.root)),out+'/audits/workspace-phase22p');assert.match(f.socket,/^\/tmp\/abx-pg-[\w-]+$/);assert.match(f.database,/^phase19b_[a-f0-9]{32}$/);
Object.assign(process.env,{NODE_ENV:'test',WORKSPACE_OPERATIONS_ENABLED:'true',CREATOR_PAYEE_ENCRYPTION_KEY:'1'.repeat(64),CREATOR_BANK_SETTLEMENT_ENABLED:'true',RAZORPAY_KEY_ID:'rzp_test_SYNTHETIC',RAZORPAY_KEY_SECRET:'synthetic-only-key',COURSE_RAZORPAY_ACCOUNT_ID:'acc_stage2a',COURSE_RAZORPAY_WEBHOOK_SECRET:'synthetic-stage2a-webhook-secret-32-characters',RAZORPAYX_KEY_ID:'rzp_test_SYNTHETICX',RAZORPAYX_KEY_SECRET:'synthetic-payout-key-only',RAZORPAYX_MERCHANT_ACCOUNT_ID:'acc_synthetic',RAZORPAYX_FUNDING_ACCOUNT_NUMBER:'000000123456',RAZORPAYX_WEBHOOK_SECRET:'synthetic-payout-webhook-secret-32-characters',RAZORPAYX_TRANSFER_MODE:'NEFT',CREATOR_RAZORPAYX_ENABLED:'true',RAZORPAYX_TEST_AUTHORIZED:'true',CREATOR_BANK_VALIDATION_TRANSPORT:'synthetic',RAZORPAYX_FAV_AMOUNT_PAISE:'100',RAZORPAYX_FAV_METHOD:'pennydrop'});
const clients=[],checks=[],measurements={},ok=name=>{checks.push(name);console.log('PASS '+name);};
(async()=>{try{
 for(let i=0;i<2;i++)clients.push(req('postgres')({host:f.socket,port:55439,database:f.database,user:'phase19b',max:1,prepare:false}));
 const c=clients[0],[identity]=await c`select current_setting('data_directory') directory,inet_server_addr() address`;assert.equal(fs.realpathSync(identity.directory),f.root+'/data');assert.equal(identity.address,null);
 const schema=createLoader({'server-only':{}})('@/lib/db/schema');
 const stacks=clients.map(client=>{const db=req('drizzle-orm/postgres-js').drizzle(client,{schema});return {db,load:createLoader({'server-only':{},'@/lib/db':{db},'@/lib/auth':{getSession:async()=>null}})};});const {db,load}=stacks[0];
 assert.equal((await c`select count(*)::int n from drizzle.__drizzle_migrations`)[0].n,45);ok('45_migrations_installed_in_private_fixture');
 // Independent students, no browser callbacks: the existing quote/checkout path
 // freezes price/tax and records pending checks before synthetic capture.
 const scope='test:acc_stage2a',payments=new Map(),disputes=new Map();let delay=0;
 const provider={orders:{create:async o=>({id:'order_'+randomUUID().replaceAll('-',''),amount:o.amount,currency:'INR'}),fetchPayments:async id=>({items:[...payments.values()].filter(p=>p.order_id===id)})},payments:{fetch:async id=>{if(delay)await new Promise(r=>setTimeout(r,delay));const p=payments.get(id);if(!p)throw Error('synthetic_missing_payment');return {...p};}},disputes:{fetch:async id=>({...disputes.get(id)}),all:async({count,skip})=>({items:[...disputes.values()].slice(skip,skip+count)})}};
 const commerce=load('@/lib/commerce/service').commerceService(db,provider,scope),sales=[];
 for(let i=0;i<7;i++){
  const buyer=randomUUID();await c`insert into users(id,full_name,role) values(${buyer},'SYNTHETIC STAGE2A BUYER','student')`;
  const quote=await commerce.quote(buyer,f.courseId),created=await commerce.create(buyer,f.courseId),id='pay_'+randomUUID().replaceAll('-','');
  const payment={id,order_id:created.id,amount:quote.evidence.totalPaise,currency:'INR',status:'captured',amount_refunded:0,fee:236,tax:36};payments.set(id,payment);sales.push({buyer,order:created.id,id});
  const body=JSON.stringify({account_id:'acc_stage2a',event:'payment.captured',payload:{payment:{entity:payment}}}),eventId=randomUUID(),sig=createHmac('sha256',process.env.COURSE_RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');
  const request=()=>new Request('http://localhost/webhook',{method:'POST',headers:{'x-razorpay-signature':sig,'x-razorpay-event-id':eventId},body});
  await load('@/lib/creator-payments/webhook').receiveCourseWebhook(request(),db);await load('@/lib/creator-payments/webhook').receiveCourseWebhook(request(),db);
 }
 const work=(i=0,options={})=>stacks[i].load('@/lib/creator-payments/worker').runCourseFinanceWorker(stacks[i].db,provider,scope,options);
 delay=200;const start=Date.now(),stopped=await work(0,{budgetMs:40});measurements.slowCourseInvocationMs=Date.now()-start;
 assert(stopped.deadlineReached);assert(measurements.slowCourseInvocationMs<1000);
 assert.equal((await c`select count(*)::int n from orders where razorpay_order_id in ${c(sales.map(s=>s.order))} and status='paid'`)[0].n,0);
 assert((await c`select count(*)::int n from course_payment_inbox where scope=${scope} and attempts=0`)[0].n>=6);
 await new Promise(r=>setTimeout(r,220));assert.equal((await c`select count(*)::int n from enrollments where user_id in ${c(sales.map(s=>s.buyer))}`)[0].n,0);ok('slow_provider_deadline_claims_one_intent_and_late_response_cannot_grant_access');
 delay=0;await c`update course_payment_inbox set next_attempt_at=now() where scope=${scope}`;await c`update course_payment_checks set next_check_at=now() where scope=${scope}`;
 const raced=await Promise.all([work(0,{batch:1}),work(1,{batch:1})]);assert(raced.some(r=>r.deferred===1&&r.processed===0));
 for(let i=0;i<10;i++)await work();
 const settled=await c`select o.id,o.user_id,o.status,(select count(*) from enrollments e where e.user_id=o.user_id and e.course_id=o.course_id)::int enrollments,(select count(*) from creator_ledger l where l.order_id=o.id)::int ledger from orders o where o.razorpay_order_id in ${c(sales.map(s=>s.order))}`;
 assert(settled.every(s=>s.status==='paid'&&s.enrollments===1&&s.ledger===2));
 await work();assert.equal((await c`select count(*)::int n from creator_ledger where order_id in ${c(settled.map(s=>s.id))}`)[0].n,14);ok('partial_batches_concurrent_scope_leases_and_repeated_runs_settle_each_capture_exactly_once');
 for(const sale of sales.slice(0,3)){const id='disp_'+randomUUID().replaceAll('-','');disputes.set(id,{id,payment_id:sale.id,amount:100,currency:'INR',status:'open'});}
 await c`update course_finance_runs set phase=2,dispute_skip=0,dispute_next_at=now() where scope=${scope}`;delay=40;
 const partial=await work(0,{budgetMs:145}),[cursor]=await c`select dispute_skip,last_error from course_finance_runs where scope=${scope}`;assert(partial.deadlineReached);assert(cursor.dispute_skip>=1&&cursor.dispute_skip<3);assert(cursor.last_error);
 const monitor=load('@/lib/workspace/operations/monitoring').operationalMonitoring(db,scope);assert((await monitor(f.adminId,'payments')).rows.some(r=>r.title==='Dispute recovery needs review'));
 delay=0;await c`update course_finance_runs set phase=2,dispute_next_at=now() where scope=${scope}`;await work();await work();
 assert.equal((await c`select count(*)::int n from creator_ledger where kind='dispute' and order_id in ${c(settled.map(s=>s.id))}`)[0].n,3);ok('dispute_cursor_survives_midpage_deadline_and_backlog_is_visible_without_duplicate_adjustments');
 // Shipping media service and PostgreSQL checkpoint store, synthetic AWS transport.
 const sourceBytes=Buffer.from('000000186674797069736f6d0000020069736f6d6d703432','hex'),checksum=createHash('sha256').update(sourceBytes).digest('hex');
 const sourceProvider={identity:{provider:'s3',container:'synthetic-stage2a-private',accountId:'123456789012'},authorize:async()=>({url:'https://synthetic.invalid/upload',method:'PUT',headers:{},expiresAt:new Date(Date.now()+60000).toISOString()}),inspect:async()=>({versionId:'source-v1',checksum,prefix:sourceBytes}),download:async()=>sourceBytes};
 const media=load('@/lib/workspace/media/uploads').mediaUploads(load('@/lib/workspace/media/repository').postgresMediaStore,'test',()=>new Date(),sourceProvider,true);
 const [lesson]=await c`select media_revision from workspace_course_lessons where id=${f.lessonId}`;
 const intent=await media.intent(f.owner,{lessonId:f.lessonId,assetKind:'video',filename:'stage2a.mp4',mimeType:'video/mp4',byteSize:sourceBytes.length,requestKey:randomUUID(),expectedMediaRevision:lesson.media_revision});
 await media.authorize(f.owner,intent.asset.id,{checksumSHA256:checksum});await media.finalize(f.owner,intent.asset.id,{});
 let selected,selectedJob,dispatches=0,failName='',segmentCount=1998;
 const names=()=>['master.m3u8','master_720.m3u8',...Array.from({length:segmentCount},(_,i)=>'master_720_'+String(i).padStart(5,'0')+'.ts')];
 const bytes=name=>name.endsWith('.ts')?Buffer.alloc(188,0x47):Buffer.from(name==='master.m3u8'?'#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100\nmaster_720.m3u8\n':'#EXTM3U\n'+names().slice(2).map(n=>'#EXTINF:6,\n'+n).join('\n')+'\n#EXT-X-ENDLIST\n');
 const command=class{constructor(input){this.input=input;}};
 const aws={S3Client:class{async send(cmd){const input=cmd.input;if(input.MaxKeys){const start=Number(input.ContinuationToken??0),list=names(),part=list.slice(start,start+1000);return {Contents:part.map(n=>({Key:`workspace/${selected.creatorProfileId}/${selected.projectId}/${selected.id}/processed/`+n,Size:bytes(n).length,ETag:'synthetic-etag'})),IsTruncated:start+1000<list.length,...(start+1000<list.length?{NextContinuationToken:String(start+1000)}:{})};}const name=input.Key.split('/').at(-1);if(name===failName)throw Error('synthetic_io_interrupted');const data=bytes(name);return {VersionId:'output-v1',ContentLength:data.length,ETag:'synthetic-etag',ServerSideEncryption:'AES256',Body:{transformToWebStream:()=>new ReadableStream({start(c){c.enqueue(data);c.close();}})}};}},CopyObjectCommand:command,HeadObjectCommand:command,GetObjectCommand:command,ListObjectsV2Command:command};
 const mc={MediaConvertClient:class{async send(){return {Job:{Id:'aws-'+selectedJob.id,Role:config.role,Queue:config.queue,Status:'COMPLETE',UserMetadata:{workspaceAsset:selected.id,workspaceJob:selectedJob.id,sourceVersion:selectedJob.sourceVersion,policy:selectedJob.policy},Settings:{Inputs:[{FileInput:`s3://${config.bucket}/workspace/${selected.creatorProfileId}/${selected.projectId}/${selected.id}/jobs/${selectedJob.id}/input.mp4`}],OutputGroups:[{OutputGroupSettings:{HlsGroupSettings:{Destination:`s3://${config.bucket}/workspace/${selected.creatorProfileId}/${selected.projectId}/${selected.id}/processed/master`}}}]}}};}},CreateJobCommand:command,GetJobCommand:command};
 const config={region:'us-east-1',bucket:sourceProvider.identity.container,accountId:'123456789012',accessKeyId:'synthetic',secretAccessKey:'synthetic',role:'arn:aws:iam::123456789012:role/Synthetic',queue:'arn:aws:mediaconvert:us-east-1:123456789012:queues/Synthetic'};
 const providerLoad=createLoader({'server-only':{},'@/lib/db':{db},'@aws-sdk/client-s3':aws,'@aws-sdk/client-mediaconvert':mc,'./provider':{mediaStorageConfig:()=>config,s3MediaStorage:()=>sourceProvider}});
 const processor=providerLoad('@/lib/workspace/media/processing-provider').processingProvider(config);
 const service=load('@/lib/workspace/media/processing').mediaProcessing(load('@/lib/workspace/media/repository').postgresMediaStore,'test',()=>new Date(),{dispatch:async(a,j)=>{selected=a;selectedJob=j;dispatches++;return 'aws-'+j.id;},inspect:processor.inspect});
 await Promise.all([service.dispatch(f.owner,intent.asset.id),service.dispatch(f.owner,intent.asset.id)]);assert.equal(dispatches,1);
 failName='master_720_00002.ts';await assert.rejects(service.reconcile(f.owner,intent.asset.id));let [cp]=await c`select * from workspace_media_verifications where job_id=${selectedJob.id}`;assert.equal(Object.keys(cp.verified).length,4);assert.equal((await c`select status from workspace_course_assets where id=${selected.id}`)[0].status,'processing');
 await assert.rejects(c`update workspace_media_jobs set state='complete',manifest=${JSON.stringify(cp.verified)}::jsonb where id=${selectedJob.id}`);
 await assert.rejects(c`delete from workspace_media_verifications where job_id=${selectedJob.id}`);ok('media_interruption_persists_verified_prefix_and_database_rejects_partial_ready_or_deleted_evidence');
 const resumeStarted=Date.now();failName='';await Promise.allSettled([service.reconcile(f.owner,selected.id),service.reconcile(f.owner,selected.id)]);
 let passes=0;while((await c`select status from workspace_course_assets where id=${selected.id}`)[0].status==='processing'){await service.reconcile(f.owner,selected.id);assert(++passes<25);}
 [cp]=await c`select * from workspace_media_verifications where job_id=${selectedJob.id}`;assert.equal((await c`select status from workspace_course_assets where id=${selected.id}`)[0].status,'ready');assert.equal(cp.phase,'complete');assert.equal(Object.keys(cp.verified).length,2000);assert.equal((await c`select state from workspace_media_jobs where id=${selectedJob.id}`)[0].state,'complete');assert.equal(dispatches,1);measurements.maximumMediaResumeMs=Date.now()-resumeStarted;measurements.maximumMediaOutputObjects=2000;measurements.maximumMediaAdditionalPasses=passes+2;
 await assert.rejects(c`update workspace_media_verifications set verified='{}'::jsonb,version=version+1 where job_id=${selectedJob.id}`);ok('concurrent_media_resume_finishes_full_manifest_once_without_retranscoding_or_rewriting_evidence');
 // First-class FAV health, same safe synthetic provider transport used in Phase25A.
 const {initialBank,createBankTransport}=require('./phase25a-bank-provider.cjs');let bankState=initialBank();
 const bankConfig=load('@/lib/creator-payments/bank-validation/config').bankValidationConfiguration(),bankProvider=load('@/lib/creator-payments/bank-validation/adapter').bankValidationAdapter(bankConfig,createBankTransport(()=>bankState,s=>bankState=s));
 const finance=load('@/lib/creator-payments/settlement').settlementService(db,'test:acc_synthetic'),commandFor=(action,extra={})=>({action,creatorId:f.owner,requestKey:randomUUID(),evidence:'SYNTHETIC independently reviewed Stage2A bank evidence',...extra});
 const account='000000'+String(Math.floor(Math.random()*1e8)).padStart(8,'0');const bank=(await finance.execute(f.owner,commandFor('save_payee',{holder:'SYNTHETIC BANK HOLDER',account,confirmAccount:account,ifsc:'TEST0000001',acknowledged:true}))).id;
 await finance.execute(f.adminId,commandFor('request_bank_validation',{entityId:bank}));const observer=load('@/lib/workspace/operations/worker').operationalWorker(db),bankWork=()=>load('@/lib/creator-payments/bank-validation/worker').runBankValidationWorker(db,bankConfig,bankProvider,1);
 await observer('bank_validations',bankWork,r=>r.review>0||r.blocked>0);const [healthy]=await c`select * from workspace_worker_health where key='bank_validations'`;assert.equal(healthy.outcome,'success');assert(healthy.succeeded_at&&healthy.started_at&&healthy.finished_at);ok('bank_validation_has_own_success_attempt_and_backlog_health_identity');
 await assert.rejects(observer('bank_validations',()=>load('@/lib/creator-payments/bank-validation/worker').runBankValidationWorker(db,{...bankConfig,enabled:false},bankProvider)));
 const [failed]=await c`select * from workspace_worker_health where key='bank_validations'`;assert.equal(failed.outcome,'failed');assert.equal(new Date(failed.succeeded_at).getTime(),new Date(healthy.succeeded_at).getTime());
 await c`update workspace_worker_health set outcome='success',started_at=now()-interval '20 minutes',finished_at=now()-interval '20 minutes',lease_until=null where key='bank_validations'`;
 assert.equal(load('@/lib/workspace/operations/model').workerHealth((await c`select * from workspace_worker_health where key='bank_validations'`)[0],1),'Stale');ok('failed_attempt_keeps_last_success_and_missed_invocation_becomes_stale');
 const account2=account+'1',bank2=(await finance.execute(f.owner,commandFor('save_payee',{holder:'SYNTHETIC BANK HOLDER',account:account2,confirmAccount:account2,ifsc:'TEST0000001',acknowledged:true}))).id;
 await finance.execute(f.adminId,commandFor('request_bank_validation',{entityId:bank2}));bankState.settings.loseValidationResponse=1;
 const uncertain=await observer('bank_validations',bankWork,r=>r.review>0);assert(uncertain.pending>=1&&uncertain.uncertain>=1);
 let queue=await monitor(f.adminId,'bank_validations');assert(queue.rows.some(r=>r.status==='uncertain'&&r.href.endsWith(bank2)));await assert.rejects(monitor(f.other,'bank_validations'));
 const account3=account+'2',bank3=(await finance.execute(f.owner,commandFor('save_payee',{holder:'SYNTHETIC BANK HOLDER',account:account3,confirmAccount:account3,ifsc:'TEST0000001',acknowledged:true}))).id;await finance.execute(f.adminId,commandFor('request_bank_validation',{entityId:bank3}));
 process.env.CREATOR_BANK_VALIDATION_TRANSPORT='disabled';queue=await monitor(f.adminId,'bank_validations');assert(queue.rows.some(r=>r.status==='configuration_blocked'&&r.href.endsWith(bank3)));assert(queue.rows.some(r=>r.status==='uncertain'&&r.href.endsWith(bank2)));process.env.CREATOR_BANK_VALIDATION_TRANSPORT='synthetic';ok('uncertain_blocked_validation_backlog_is_admin_only_and_links_original_bank_version');
 fs.writeFileSync(out+'/postgres-stage2a.json',JSON.stringify({checks,measurements,syntheticOnly:true,fixtureAsset:selected.id},null,2));
 }finally{await Promise.all(clients.map(c=>c.end()));}})().catch(e=>{console.error('Stage2A PostgreSQL: '+e.message);console.error(e.stack?.split('\n').slice(0,8).join('\n'));process.exitCode=1;});
