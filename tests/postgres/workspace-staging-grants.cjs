// Owned synthetic PostgreSQL integration only; never creates provider operations.
module.exports=async({c,stacks,owner,adminId,other,ok})=>{
 const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),saved={...process.env},load=stacks[0].load;
 const money=async()=>{const out=[];for(const table of ['orders','enrollments','progress','creator_ledger','creator_payouts','creator_payout_jobs','creator_bank_validations'])out.push(await c.unsafe(`select to_jsonb(t) data from ${table} t order by id`));return JSON.stringify(out);};
 const before=await money(),oldGrants=JSON.stringify(await c`select to_jsonb(g) data from workspace_access_grants g order by id`);
 try{
  for(const key of Object.keys(process.env))if(key.startsWith('RAZORPAY')||key.startsWith('WORKSPACE_RAZORPAY')||key.startsWith('COURSE_RAZORPAY')||key.startsWith('VERCEL')||key.startsWith('WORKSPACE_PRODUCTION_')||key==='WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED')delete process.env[key];
  Object.assign(process.env,{NODE_ENV:'production',DATABASE_ENV:'staging',WORKSPACE_DEPLOYMENT_PROVIDER:'self-hosted',WORKSPACE_DEPLOYMENT_ENV:'staging',WORKSPACE_SELF_HOSTED_STAGING_AUTHORIZED:'true',WORKSPACE_PAYMENT_ENABLED:'true',WORKSPACE_RAZORPAY_LIVE_AUTHORIZED:'true',CREATOR_RAZORPAYX_ENABLED:'true',CREATOR_BANK_VALIDATION_ENABLED:'true',ACADEMY_ENTITLEMENT_POLICY_ENABLED:'false'});
  assert.equal(load('@/lib/workspace/payments/classification').classifyWorkspaceRuntime(),'staging');
  const repo=load('@/lib/workspace/access/repository');
  const productionOwner=(await c`select id from users where full_name='SYNTHETIC INDEPENDENT LIVE CREATOR'`)[0].id;
  for(const id of [owner,productionOwner])assert.equal(await repo.readGrantEvidence(id),null);
  const creator=load('@/lib/workspace/creator/repository').workspaceContent();
  const content={title:'Synthetic staging course',category:'cabin_crew',description:'Isolated synthetic staging authoring and environment-bound grant verification only.',targetLearner:'Synthetic learner',learningOutcomes:['Understand staging isolation'],outline:[],tentativePricePaise:null};
  for(const id of [owner,productionOwner,other])await assert.rejects(creator.create(id,randomUUID(),content));
  ok('staging_rejects_production_test_and_unauthorized_creator_authoring_without_borrowing_grants');
  const id=randomUUID();await c`insert into users(id,full_name,role) values(${id},'SYNTHETIC STAGING CREATOR','student')`;
  const [settings]=await c`select id from workspace_eligibility_settings where is_current`,[policy]=await c`select id from workspace_policy_versions where is_current`,eligibility=load('@/lib/workspace/eligibility/model');
  const parsed=eligibility.validateSubmission({submissionKey:randomUUID(),settingsId:settings.id,policyId:policy.id,category:'pilot_flight_crew',aviationProfession:'',experienceOption:'two_years',professionalStatus:'retired',professionalStatusDetail:'',professionalProfileUrl:'https://example.com/synthetic-staging',teachingCategory:'flight_operations',courseIdea:'Synthetic staging isolation course',declarations:Object.fromEntries(Object.keys(eligibility.DECLARATIONS).map(k=>[k,true]))});assert(parsed.success);await load('@/lib/workspace/eligibility/service').submitEligibility(id,parsed.data);
  const terms=load('@/lib/workspace/terms/model').currentCreatorTerms();await load('@/lib/workspace/terms/service').createCreatorTermsService(load('@/lib/workspace/terms/repository').postgresCreatorTermsStore).accept(id,{acknowledged:true},'"'+terms.contentHash+'"');
  const cmd={targetUserId:id,reason:'Synthetic independently authorized staging authoring only',durationMonths:3,requestKey:randomUUID()};
  await assert.rejects(repo.createAccessGrant(other,cmd),e=>e.code==='forbidden');
  const results=await Promise.all(stacks.map(s=>s.load('@/lib/workspace/access/repository').createAccessGrant(adminId,cmd)));assert.equal(results[0].id,results[1].id);assert.equal(results[0].environment,'staging');
  assert.equal((await c`select count(*)::int n from workspace_access_grant_events where grant_id=${results[0].id}`)[0].n,1);
  await assert.rejects(repo.createAccessGrant(adminId,{...cmd,requestKey:randomUUID()}),e=>e.code==='duplicate');
  await assert.rejects(c`update workspace_access_grants set environment='production' where id=${results[0].id}`);
  assert.equal((await repo.readGrantEvidence(id)).environment,'staging');const draft=await creator.create(id,randomUUID(),content);const builder=load('@/lib/workspace/builder/repository').workspaceBuilder();await builder.start(id,draft.id,{});await builder.mutate(id,draft.id,{action:'create_module',content:{title:'Staging module',description:''}});
  ok('staging_persisted_admin_grants_require_eligibility_terms_and_immutable_audit_concurrent_replay_once');
  const config=load('@/lib/workspace/payments/configuration');for(const capability of ['checkout','refund','webhook','reconciliation','refund_reconciliation'])assert.equal(config.financialConfiguration(capability),null);
  assert.throws(()=>load('@/lib/creator-payments/razorpayx/config').payoutConfiguration());
  assert.throws(()=>load('@/lib/creator-payments/bank-validation/config').bankValidationConfiguration());
  assert.equal(load('@/lib/academy-entitlements/model').prospectiveAcademyPolicy(),null);
  ok('staging_financial_configuration_rejected_before_provider_transport_or_money_mutation');
  delete process.env.WORKSPACE_SELF_HOSTED_STAGING_AUTHORIZED;
  Object.assign(process.env,{DATABASE_ENV:'production',WORKSPACE_DEPLOYMENT_ENV:'production',WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED:'true',WORKSPACE_PRODUCTION_ACCOUNT_ID:'acc_SYNTHETICPROD',WORKSPACE_RAZORPAY_ACCOUNT_ID:'acc_SYNTHETICPROD',WORKSPACE_RAZORPAY_MODE:'live',WORKSPACE_RAZORPAY_KEY_ID:'rzp_live_SYNTHETICPROD'});
  assert.equal(load('@/lib/workspace/payments/classification').classifyWorkspaceRuntime(),'production');assert.equal(await repo.readGrantEvidence(id),null);await assert.rejects(creator.create(id,randomUUID(),content));
  assert.equal(JSON.stringify(await c`select to_jsonb(g) data from workspace_access_grants g where id<>${results[0].id} order by id`),oldGrants);assert.equal(await money(),before);
  ok('staging_grants_cannot_authorize_production_existing_grants_and_all_financial_academy_records_unchanged');
 }finally{for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);}
};
