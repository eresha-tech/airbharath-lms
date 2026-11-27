// Called only by the owned synthetic PostgreSQL integration harness.
module.exports=async({c,stacks,owner,adminId,other,ok})=>{
 const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
 const repos=stacks.map(s=>s.load('@/lib/mentorship/repository').mentorRepository(s.db));
 const {MENTOR_CONSENT_VERSION}=stacks[0].load('@/lib/mentorship/model');
 const input={requestKey:randomUUID(),fullName:'Synthetic Withdrawn Applicant',email:'withdrawn@example.invalid',phone:'',specialisation:'flight_operations',professionalRole:'Synthetic instructor',yearsExperience:5,profileUrl:'',description:'Synthetic aviation mentoring experience for local verification only.',adult:true,consent:true,consentVersion:MENTOR_CONSENT_VERSION};
 const moneyTables=['orders','enrollments','progress','creator_ledger','creator_payouts'];
 async function fingerprint(){const out=[];for(const t of moneyTables)out.push(await c.unsafe(`select to_jsonb(t) data from ${t} t order by id`));return JSON.stringify(out);}
 const baseline=await fingerprint();const a=await repos[0].submit(owner,input);const original=(await c`select full_name,email,phone,description,consent_text from mentor_applications where id=${a.id}`)[0];
 await repos[0].review(adminId,a.id,{requestKey:randomUUID(),expectedVersion:1,status:'under_review',note:'Synthetic private screening evidence.'});
 // Force a stale screening/contact request to wait behind withdrawal's row lock.
 let locked,release;const ready=new Promise(r=>locked=r),wait=new Promise(r=>release=r);
 const withdrawal=c.begin(async tx=>{await tx`select id from mentor_applications where id=${a.id} for update`;await tx`select set_config('airbharath.mentor_actor',${owner},true)`;await tx`insert into mentor_withdrawals(application_id,owner_id,request_key) values(${a.id},${owner},${randomUUID()})`;locked();await wait;});await ready;
 const pending=repos[1].review(adminId,a.id,{requestKey:randomUUID(),expectedVersion:2,status:'contacted',note:'This stale contact decision must fail.'});release();await withdrawal;await assert.rejects(pending,e=>e.status===409);
 const results=await Promise.all(repos.map(r=>r.withdraw(owner,{requestKey:randomUUID(),confirmed:true})));assert(results.every(x=>x.id===a.id));assert.equal((await c`select count(*)::int n from mentor_withdrawals where application_id=${a.id}`)[0].n,1);ok('mentor_withdrawal_concurrent_idempotent_and_stale_contact_decision_rejected');
 await assert.rejects(repos[0].submit(owner,{...input,requestKey:randomUUID()}),e=>e.status===409);await assert.rejects(repos[0].withdraw(other,{requestKey:randomUUID(),confirmed:true}),e=>e.status===404);
 for(const status of ['under_review','shortlisted','contacted','not_selected'])await assert.rejects(repos[0].review(adminId,a.id,{requestKey:randomUUID(),expectedVersion:2,status,note:'No further screening allowed.'}),e=>e.status===409);
 await assert.rejects(c.begin(async tx=>{await tx`select set_config('airbharath.mentor_actor',${adminId},true)`;await tx`update mentor_applications set status='contacted',version=version+1,updated_at=now() where id=${a.id}`;}));
 await assert.rejects(c`delete from mentor_withdrawals where application_id=${a.id}`);await assert.rejects(c`truncate mentor_withdrawals`);ok('mentor_suppression_blocks_repeat_submissions_direct_database_review_and_evidence_erasure');
 const own=await repos[0].own(owner);assert(own.withdrawn_at);const detail=await repos[0].adminRead(adminId,a.id);assert(detail.application.withdrawn_at);assert.equal(detail.application.email,undefined);assert.deepEqual(detail.history,[]);assert(!(await repos[0].adminRead(adminId)).rows.some(r=>r.id===a.id));await assert.rejects(repos[0].adminRead(other,a.id),e=>e.status===403);
 assert.deepEqual((await c`select full_name,email,phone,description,consent_text from mentor_applications where id=${a.id}`)[0],original);assert.equal(await fingerprint(),baseline);ok('mentor_minimal_audit_private_admin_suppression_retains_records_and_preserves_academy_creator_finances');
};
