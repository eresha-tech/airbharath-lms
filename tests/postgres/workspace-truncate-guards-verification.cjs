// Opt-in F.6R proof. Creates and removes only its own uniquely named synthetic database.
// Never imports the application's URL-substring connection factory.
'use strict';
const {req,createLoader}=require('./workspace-financial-loader.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict'),{randomUUID,randomBytes,createHash}=require('node:crypto');
if(process.env.WORKSPACE_F6R_DISPOSABLE_VERIFY!=='true')process.exit(0);
assert.equal(process.env.DATABASE_ENV,'development');
assert.equal(process.env.WORKSPACE_PAYMENT_ENABLED,'false');
assert.equal(process.env.WORKSPACE_RAZORPAY_TEST_AUTHORIZED,'false');
const bootstrap=new URL(process.env.DATABASE_URL);
assert.equal(bootstrap.hostname,'localhost');assert.equal(bootstrap.port,'5433');assert.equal(bootstrap.pathname,'/airbharath_lms');
const suffix=randomBytes(8).toString('hex'),database='workspace_f6r_disposable_'+suffix,role='workspace_f6r_runtime_'+suffix;
assert(/^workspace_f6r_disposable_[a-f0-9]{16}$/.test(database));
const maintenanceUrl=new URL(bootstrap);maintenanceUrl.pathname='/postgres';
const disposableUrl=new URL(bootstrap);disposableUrl.pathname='/'+database;
assert.notEqual(disposableUrl.pathname,bootstrap.pathname);
const options={max:1,prepare:false,connect_timeout:5,idle_timeout:2,onnotice:()=>{},connection:{statement_timeout:20000,lock_timeout:2000,idle_in_transaction_session_timeout:20000}};
const control=req('postgres')(maintenanceUrl.toString(),options);
let sql,created=false,roleCreated=false,createdOid,stage='maintenance identity';
const result={database,system:'7680462735222304705',checks:[],externalCalls:0,cleanup:{database:false,role:false}};
const out='output/audits/workspace-f6r/disposable-verification.json';
const save=()=>fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
const ok=(name,data={})=>{result.checks.push({name,...data});save();console.log(JSON.stringify({name,...data}));};
const code=e=>e.code||e.cause?.code;
global.fetch=async()=>{result.externalCalls++;throw Error('External HTTP forbidden in disposable verification');};
const journal=JSON.parse(fs.readFileSync('drizzle/meta/_journal.json'));
const review=JSON.parse(fs.readFileSync('output/audits/workspace-f6r/coverage-review.json'));
const hash=x=>createHash('sha256').update(x).digest('hex');
assert.equal(journal.entries.length,31);
for(const old of review.priorMigrationHashes)assert.equal(hash(fs.readFileSync('drizzle/'+old.tag+'.sql')),old.sha256);
const proposal=fs.readFileSync('drizzle/0030_workspace_retained_history_truncate_guards.sql','utf8');
assert.equal(hash(proposal),review.proposedSqlSha256);
const targets=review.rows.filter(r=>r.decision==='add_guard').map(r=>r.table);
const migrationFolder=fs.mkdtempSync(path.join(os.tmpdir(),'workspace-f6r-migrations-'));
fs.mkdirSync(path.join(migrationFolder,'meta'));
fs.writeFileSync(path.join(migrationFolder,'meta/_journal.json'),JSON.stringify({...journal,entries:journal.entries.slice(0,30)}));
for(const entry of journal.entries.slice(0,30))fs.copyFileSync('drizzle/'+entry.tag+'.sql',path.join(migrationFolder,entry.tag+'.sql'));
async function snapshot(){
 const tables=await sql`select schemaname,tablename from pg_tables where schemaname in ('public','drizzle') order by 1,2`;
 const rows={};for(const t of tables)rows[t.schemaname+'.'+t.tablename]=await sql`select md5(to_jsonb(r)::text) as hash,count(*)::int as n from ${sql(t.schemaname+'.'+t.tablename)} r group by 1 order by 1`;
 return JSON.parse(JSON.stringify(rows));
}
async function rejected(query,expected='23514',dedicated=false){
 const before=await snapshot();
 await assert.rejects(sql.begin(async tx=>{await tx.unsafe(query)}),e=>code(e)===expected&&(!dedicated||e.message.includes('Workspace retained history cannot be truncated')));
 assert.deepEqual(await snapshot(),before);
 ok('refused_statement_preserves_all_rows',{statement:query,sqlstate:expected});
}
async function applyProposal(tx){for(const statement of proposal.split('--> statement-breakpoint'))await tx.unsafe(statement);}
async function normalServices(){
 const base=createLoader({'server-only':{}}),schema=base('@/lib/db/schema'),db=req('drizzle-orm/postgres-js').drizzle(sql,{schema});
 const load=createLoader({'server-only':{},'@/lib/db':{db}}),run=randomUUID(),users={};
 const creator=load('@/lib/workspace/creator/repository').workspaceContent(),reviews=load('@/lib/workspace/review/repository').workspaceReviews(),builder=load('@/lib/workspace/builder/repository').workspaceBuilder();
 const settings=(await sql`select id from workspace_eligibility_settings where is_current`)[0],policy=(await sql`select id from workspace_policy_versions where is_current`)[0];
 const plan=(await load('@/lib/workspace/membership/service').getCurrentPlans()).find(p=>p.code==='quarterly');
 const context={accountId:'acc_SYNTHETIC_F6R_'+run.replaceAll('-',''),mode:'test'},facts={orders:[],payments:[],refunds:[]};
 const provider={context,createOrder:async input=>{const o={...context,id:'order_'+randomUUID().replaceAll('-',''),receipt:input.receipt,amountPaise:input.amountPaise,currency:'INR',status:'created',createdAt:new Date()};facts.orders.push(o);return o;},fetchOrder:async id=>facts.orders.find(o=>o.id===id),fetchPayment:async id=>facts.payments.find(p=>p.id===id),fetchOrderPayments:async id=>facts.payments.filter(p=>p.orderId===id)};
 const store=load('@/lib/workspace/payments/repository').postgresFinanceStore,finance=load('@/lib/workspace/payments/service').createWorkspacePaymentService(store,provider);
 const activation=load('@/lib/workspace/activation/service').createWorkspaceActivationService(load('@/lib/workspace/activation/repository').postgresActivationStore,'development',()=>new Date(),context);
 const mail=new Map(),email=load('@/lib/workspace/email/service').createEmailVerificationService(load('@/lib/workspace/email/repository').createPostgresEmailStore(db),{send:async input=>{mail.set(input.challengeId,input.code);return 'accepted';}},randomBytes(32).toString('hex'));
 async function identity(label,eligible=true,admin=false){
  const id=randomUUID();await sql`insert into users(id,phone,full_name,role) values(${id},${'WSF6R_'+run+'_'+label},${'SYNTHETIC F6R '+label},${admin?'admin':'student'})`;users[label]=id;
  if(eligible){const em=load('@/lib/workspace/eligibility/model'),parsed=em.validateSubmission({submissionKey:randomUUID(),settingsId:settings.id,policyId:policy.id,category:'pilot_flight_crew',aviationProfession:'',experienceOption:'two_years',professionalStatus:'retired',professionalStatusDetail:'',professionalProfileUrl:'https://example.com/synthetic',teachingCategory:'flight_operations',courseIdea:'Synthetic F6R aviation course preparation',declarations:Object.fromEntries(Object.keys(em.DECLARATIONS).map(k=>[k,true]))});assert(parsed.success);await load('@/lib/workspace/eligibility/service').submitEligibility(id,parsed.data);}
  return id;
 }
 async function legal(id,kind='terms'){
  const config=kind==='terms'?['createCreatorTermsService','postgresCreatorTermsStore','currentCreatorTerms']:['createRefundPolicyService','postgresRefundPolicyStore','currentRefundPolicy'];
  const doc=load('@/lib/workspace/'+kind+'/model')[config[2]]();await load('@/lib/workspace/'+kind+'/service')[config[0]](load('@/lib/workspace/'+kind+'/repository')[config[1]]).accept(id,{acknowledged:true},'"'+doc.contentHash+'"');
 }
 const admin=await identity('ADMIN',false,true),gift=await identity('GIFT'),paid=await identity('PAID'),unpaid=await identity('UNPAID');
 await legal(gift);const grants=load('@/lib/workspace/access/repository');
 const grant=await grants.createAccessGrant(admin,{targetUserId:gift,requestKey:randomUUID(),reason:'Synthetic F6R complimentary compatibility verification',durationMonths:3});
 assert((await creator.overview(gift)).capabilities.canEditWorkspace);
 assert.equal((await sql`select count(*)::int as n from workspace_membership_orders where user_id=${gift}`)[0].n,0);
 ok('normal_complimentary_grant_and_paired_audit_without_payment');
 // The deferred closure audit must still reject an otherwise legitimate transition without its event.
 const beforeGrant=await snapshot();
 await assert.rejects(sql.begin(async tx=>{await tx`update workspace_access_grants set status='revoked',closed_at=clock_timestamp(),closed_by=${admin},close_reason='Synthetic missing audit' where id=${grant.id}`;}),e=>code(e)==='23514');
 assert.deepEqual(await snapshot(),beforeGrant);ok('deferred_grant_audit_constraint_still_rejects_missing_event');
 const challenge=await email.request(paid,{email:'wsf6r-'+run+'@example.invalid'},paid);
 await email.confirm(paid,{challengeId:challenge.challenge.id,code:mail.get(challenge.challenge.id)},paid);await legal(paid);await legal(paid,'refund-policy');
 const couponCode=('F6R'+run.replaceAll('-','').slice(0,12)).toUpperCase();
 await load('@/lib/workspace/membership/service').createWorkspaceCoupon(admin,{code:couponCode,discountType:'fixed',discountValue:100,startsAt:null,expiresAt:null,usageLimit:2,planCodes:['quarterly'],campaignName:'Synthetic F6R',sourceType:'internal',sourceName:'F6R'},randomUUID());
 const ids={planCode:plan.code,planVersionId:plan.id,couponCode},quote=await load('@/lib/workspace/membership/service').getWorkspaceMembershipQuote(paid,ids);
 let order=await finance.acceptOrder(paid,{...ids,quoteHash:quote.quoteHash,requestKey:randomUUID()});
 assert.equal((await sql`select status from workspace_coupon_redemptions where membership_order_id=${order.id}`)[0].status,'reserved');
 order=await finance.ensureProviderOrder(paid,order.id);
 const payment={...context,id:'pay_'+randomUUID().replaceAll('-',''),orderId:order.providerOrderId,amountPaise:order.totalPaise,currency:'INR',state:'captured',providerCreatedAt:order.createdAt,capturedAt:new Date(),captureTimeSource:'test_authoritative',refundedPaise:0};facts.payments.push(payment);
 await finance.reconcileOrder(paid,order.id);assert.equal((await activation.fulfill(paid,order.id)).state,'fulfilled');
 assert.equal((await sql`select status from workspace_coupon_redemptions where membership_order_id=${order.id}`)[0].status,'redeemed');
 const e=await store.receiveEvent(context,{eventId:randomUUID(),type:'order.paid',hash:'a'.repeat(64),evidence:{providerOrderId:order.providerOrderId,providerPaymentId:payment.id,receipt:order.providerReceipt,eventCreatedAt:null}},new Date());await finance.processEvent(e.event.id);
 assert((await creator.overview(paid)).capabilities.canEditWorkspace);ok('normal_verified_email_legal_coupon_reservation_capture_event_fulfillment');
 const content={title:'Synthetic F6R Aviation Proposal',category:'pilot_flight_crew',description:'Synthetic aviation teaching proposal covering flight safety foundations and structured preparation through normal review.',targetLearner:'Synthetic aviation trainees',learningOutcomes:['Explain aviation safety preparation'],outline:[{title:'Safety foundations',description:'Private lesson planning',ordering:0}],tentativePricePaise:null};
 for(const uid of [gift,paid]){
  const details={displayName:'Synthetic Aviation Creator',professionalHeadline:'Flight safety educator',shortBio:'Private synthetic aviation teaching profile.',primaryAviationCategory:'pilot_flight_crew',professionalProfileUrl:'https://example.com/synthetic'};
  await creator.saveProfile(uid,0,details);await creator.saveProfile(uid,1,{...details,professionalHeadline:'Updated synthetic educator'});
  let draft=await creator.create(uid,randomUUID(),content);draft=await creator.update(uid,draft.id,draft.version,{...content,title:'Updated synthetic F6R proposal'});
  let s=await reviews.submit(uid,draft.id,{expectedDraftVersion:draft.version,requestKey:randomUUID()});
  s=await reviews.review(admin,s.id,{action:'start_review',expectedStatus:'submitted',requestKey:randomUUID()});
  s=await reviews.review(admin,s.id,{action:'approve',expectedStatus:'under_review',requestKey:randomUUID()});
  await builder.start(uid,draft.id,{approvedSubmissionId:s.id});let tree=await builder.read(uid,draft.id);
  tree=await builder.mutate(uid,draft.id,{action:'create_lesson',moduleId:tree.modules[0].id,content:{title:'Private synthetic lesson',summary:'Synthetic',content:'Private F6R text'}});
  let lesson=tree.lessons[0];tree=await builder.mutate(uid,draft.id,{action:'update_lesson',moduleId:lesson.moduleId,lessonId:lesson.id,expectedVersion:lesson.version,content:{title:'Updated private lesson',summary:'Synthetic',content:'Updated F6R text'}});
  await assert.rejects(creator.read(uid===gift?paid:gift,draft.id),e=>e.code==='not_found');
  await assert.rejects(creator.read(unpaid,draft.id),e=>e.code==='restricted');
  // Ordinary supported deletion remains available; retain another lesson for TRUNCATE proof.
  lesson=tree.lessons[0];await builder.mutate(uid,draft.id,{action:'delete_lesson',moduleId:lesson.moduleId,lessonId:lesson.id,expectedVersion:lesson.version});
  await builder.mutate(uid,draft.id,{action:'create_lesson',moduleId:tree.modules[0].id,content:{title:'Retained synthetic lesson',content:'Retained test content'}});
  const extra=await builder.mutate(uid,draft.id,{action:'create_module',content:{title:'Temporary empty module'}}),module=extra.modules.find(m=>m.title==='Temporary empty module');
  await builder.mutate(uid,draft.id,{action:'delete_module',moduleId:module.id,expectedVersion:module.version});
 }
 ok('paid_and_grant_profile_proposal_review_builder_insert_update_delete_and_owner_isolation');
 const refundProvider={context,refundMutationAllowed:()=>true,fetchPayment:provider.fetchPayment,fetchRefunds:async id=>facts.refunds.filter(r=>r.paymentId===id),createRefund:async input=>{const r={...context,id:'rfnd_'+randomUUID().replaceAll('-',''),paymentId:input.paymentId,amountPaise:input.amountPaise,currency:'INR',status:'processed',createdAt:new Date()};facts.refunds.push(r);Object.assign(payment,{refundedPaise:input.amountPaise,refundStatus:'full'});return r;}};
 const refunds=load('@/lib/workspace/refunds/service').createRefundService(load('@/lib/workspace/refunds/repository').postgresRefundStore,refundProvider);
 await refunds.request(paid,order.id,{requestKey:randomUUID(),reason:'mistake',note:'Synthetic F6R refund compatibility'});await refunds.decide(admin,order.id,{action:'approve',confirmed:true});
 assert((await creator.overview(paid)).capabilities.canViewCreatorWorkspace);assert(!(await creator.overview(paid)).capabilities.canEditWorkspace);assert((await creator.overview(gift)).capabilities.canEditWorkspace);
 await grants.revokeAccessGrant(admin,grant.id,{requestKey:randomUUID(),reason:'Synthetic normal paired closure',confirmed:true});
 assert(!(await creator.overview(gift)).capabilities.canEditWorkspace);ok('normal_refund_completion_and_normal_grant_revocation_preserve_history');
 assert.equal((await sql`select count(*)::int as n from orders`)[0].n,0);assert.equal((await sql`select count(*)::int as n from enrollments`)[0].n,0);ok('lms_financial_and_enrollment_isolation');
 await sql`insert into workspace_email_rate_limits(key,window_at,count) values(${'b'.repeat(64)},clock_timestamp(),1)`;
 return users;
}
(async()=>{try{
 const identity=(await control`select current_database() as database,current_setting('port') as port,system_identifier::text as system from pg_control_system()`)[0];
 assert.deepEqual(identity,{database:'postgres',port:'5433',system:result.system});
 assert.equal((await control`select count(*)::int as n from pg_database where datname=${database}`)[0].n,0);
 stage='create own disposable database';await control.unsafe('CREATE DATABASE '+database+" TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'");created=true;
 sql=req('postgres')(disposableUrl.toString(),options);
 const actual=(await sql`select current_database() as database,(select oid::text from pg_database where datname=current_database()) as oid,system_identifier::text as system from pg_control_system()`)[0];
 assert.equal(actual.database,database);assert.equal(actual.system,result.system);assert.notEqual(actual.oid,'16384');createdOid=actual.oid;result.oid=createdOid;
 ok('strict_disposable_identity_no_retained_connection',{oid:createdOid});
 stage='reviewed migration chain';const db=req('drizzle-orm/postgres-js').drizzle(sql),migrate=req('drizzle-orm/postgres-js/migrator').migrate;
 await migrate(db,{migrationsFolder:migrationFolder});assert.equal((await sql`select count(*)::int as n from drizzle.__drizzle_migrations`)[0].n,30);
 ok('reviewed_0000_through_0029_applied_only_to_new_database');
 stage='original gap reproduction';await sql`insert into workspace_payment_events(provider_account_id,provider_mode,event_id,event_type,payload_hash,evidence) values('acc_SYNTHETIC_F6R','test','synthetic-f6r-gap','order.paid',${'c'.repeat(64)},'{}'::jsonb)`;
 const initial=await snapshot();const rollback=Error('intentional isolated reproduction rollback');
 await assert.rejects(sql.begin(async tx=>{await tx`truncate public.workspace_payment_events`;assert.equal((await tx`select count(*)::int as n from workspace_payment_events`)[0].n,0);throw rollback;}),e=>e===rollback);assert.deepEqual(await snapshot(),initial);
 ok('original_leaf_truncate_gap_reproduced_with_synthetic_row_and_rolled_back');
 stage='unexpected catalog atomicity';
 await assert.rejects(sql.begin(async tx=>{await tx.unsafe('ALTER TABLE public.workspace_policy_versions RENAME TO workspace_policy_versions_f6r_missing');await applyProposal(tx);}),e=>code(e)==='42P01');
 assert.equal((await sql`select count(*)::int as n from pg_proc where proname='workspace_retained_history_reject_truncate'`)[0].n,0);
 assert.deepEqual(await snapshot(),initial);ok('missing_target_fails_and_rolls_back_function_and_prior_attachments');
 stage='proposal installation';await migrate(db,{migrationsFolder:'drizzle'});await migrate(db,{migrationsFolder:'drizzle'});
 assert.equal((await sql`select count(*)::int as n from drizzle.__drizzle_migrations`)[0].n,31);
 const installed=await sql`select c.relname as table,t.tgtype,t.tgenabled,p.prosecdef,p.proconfig from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid where p.proname='workspace_retained_history_reject_truncate' order by 1`;
 assert.deepEqual(installed.map(t=>t.table),targets);assert(installed.every(t=>t.tgtype===34&&t.tgenabled==='O'&&!t.prosecdef&&t.proconfig.includes('search_path=pg_catalog')));
 result.installed=JSON.parse(JSON.stringify(installed));ok('0030_installed_21_before_truncate_statement_guards_and_runner_second_run_noop');
 await assert.rejects(sql.begin(applyProposal),e=>code(e)==='42723');ok('raw_duplicate_installation_fails_safely');
 stage='temporary least privilege role';await control.unsafe('CREATE ROLE '+role+' NOLOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION');roleCreated=true;
 await sql.unsafe('GRANT USAGE ON SCHEMA public TO '+role);await sql.unsafe('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO '+role);
 // Test-only read access for whole-database preservation assertions, not migration rights.
 await sql.unsafe('GRANT USAGE ON SCHEMA drizzle TO '+role);await sql.unsafe('GRANT SELECT ON TABLE drizzle.__drizzle_migrations TO '+role);
 await sql.unsafe('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO '+role);
 await sql.unsafe('SET ROLE '+role);
 const privileges=(await sql`select current_user as role,has_table_privilege(current_user,'public.workspace_payment_events','TRUNCATE') as truncate,has_table_privilege(current_user,'public.workspace_payment_events','INSERT') as insert,has_schema_privilege(current_user,'public','CREATE') as schema_create`)[0];
 assert(!privileges.truncate&&privileges.insert&&!privileges.schema_create);result.temporaryRuntimePrivileges=privileges;
 stage='normal services under non-owner role';await normalServices();await rejected('TRUNCATE public.workspace_payment_events','42501');
 await assert.rejects(sql.begin(async tx=>{await tx.unsafe('ALTER TABLE public.workspace_payment_events DISABLE TRIGGER ALL');}),e=>code(e)==='42501');ok('non_owner_cannot_disable_triggers');
 await sql.unsafe('RESET ROLE');
 stage='owner truncate negatives';for(const t of targets){
  const incoming=review.rows.find(r=>r.table===t).incomingForeignKeyCount;
  if(incoming)await rejected('TRUNCATE public.'+t,'0A000');
  await rejected('TRUNCATE public.'+t+(incoming?' CASCADE':''),'23514',true);
 }
 // Parents with inbound FKs need a jointly included referencing closure (CASCADE).
 // Direct RESTRICT may be refused before trigger dispatch, which is also safe.
 for(const t of review.rows.filter(r=>r.decision==='existing_guard'))await rejected('TRUNCATE public.'+t.table+' CASCADE');
 await rejected('TRUNCATE public.workspace_email_rate_limits, public.workspace_payment_events','23514',true);
 await rejected('TRUNCATE public.workspace_course_projects CASCADE','23514',true);
 await rejected('TRUNCATE public.workspace_course_drafts CASCADE','23514',true);
 await rejected('TRUNCATE public.workspace_membership_orders CASCADE');
 await rejected('TRUNCATE public.workspace_coupon_plans, public.workspace_audit_events','23514',true);
 assert.equal(result.externalCalls,0);result.complete=true;ok('all_synthetic_history_preserved_after_denied_operations_no_provider_calls');
 }catch(e){result.failure={stage,code:code(e)||e.name,message:e.name==='AssertionError'?e.message.split('\n')[0]:'Isolated verification failed; private values withheld'};save();console.error(JSON.stringify(result.failure));process.exitCode=1;}
 finally{
  if(sql)await sql.end();
  if(created){const found=(await control`select oid::text as oid from pg_database where datname=${database}`)[0];assert(found&&found.oid===createdOid&&database!==bootstrap.pathname.slice(1));await control.unsafe('DROP DATABASE '+database);result.cleanup.database=(await control`select count(*)::int as n from pg_database where datname=${database}`)[0].n===0;}
  if(roleCreated){await control.unsafe('DROP ROLE '+role);result.cleanup.role=(await control`select count(*)::int as n from pg_roles where rolname=${role}`)[0].n===0;}
  await control.end();fs.rmSync(migrationFolder,{recursive:true});save();console.log(JSON.stringify({cleanup:result.cleanup,complete:!!result.complete}));
 }
})();
