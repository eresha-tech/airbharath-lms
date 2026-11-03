// Local founder preparation against the pinned UAT database, never private remote DBs.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {localTarget}=require('../../scripts/workspace-local-target.cjs'),{fixture,session,browserRuntime}=require('../../scripts/workspace-media-local-session.cjs');
if(process.env.WORKSPACE_MEDIA_FOUNDER_VERIFY!=='true'){console.log('Founder local browser verification disabled.');process.exit(0);}
const base='http://localhost:3000',report={checks:[],realMedia:false},ok=name=>{report.checks.push(name);console.log('PASS '+name);};let stage='local_target',diagnosticPage;
(async()=>{let t,b;try{
 t=await localTarget();const f=fixture(t),{chromium}=browserRuntime(),dir=path.join(t.root,'output/audits/workspace-phase19-local');
 const real=process.env.WORKSPACE_MEDIA_REAL_BROWSER_VERIFY==='true';
 if(real){stage='aws_preflight';assert((await require('../../scripts/workspace-media-preflight.cjs').preflight()).ready);}
 b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 async function context(role){const c=await b.newContext({viewport:{width:1366,height:950}});await c.addCookies([{name:'ab_session',value:await session(t,f,role),url:base,httpOnly:true,sameSite:'Lax'}]);return c;}
 const c=await context('creator'),p=await c.newPage(),api=`${base}/api/workspace/course-drafts/${f.draftId}/build`;p.on('dialog',d=>d.accept());
 diagnosticPage=p;p.on('requestfailed',r=>{if(r.method()==='PUT')console.log('Upload transport failure: '+(/^net::[A-Z_]+$/.test(r.failure()?.errorText||'')?r.failure().errorText:'transport_error'));});
 stage='creator_editor';await p.goto(`${base}/workspace/courses/${f.draftId}/build`,{waitUntil:'networkidle',timeout:120000});await p.getByRole('button',{name:'01 · Upload video and resources',exact:true}).click();await p.getByRole('heading',{name:'Lesson media',exact:true}).waitFor({timeout:60000});
 await p.waitForFunction(()=>!document.querySelector('textarea[rows="16"]')?.disabled);assert((await p.getByLabel('Lesson text',{exact:false}).inputValue()).includes('Original plain text.'));
 ok('pnpm_dev_media_hydrated_creator_private_studio');
 stage='admin_inspection';const ac=await context('admin'),ap=await ac.newPage();await ap.goto(`${base}/admin/workspace/course-builds/${f.projectId}`,{waitUntil:'networkidle',timeout:120000});await ap.getByRole('button',{name:'01 · Upload video and resources',exact:true}).click();await ap.getByRole('heading',{name:'Lesson media',exact:true}).waitFor();assert.equal(await ap.getByRole('button',{name:'Save',exact:true}).count(),0);assert.equal(await ap.getByRole('button',{name:'Choose file',exact:true}).count(),0);ok('synthetic_admin_private_read_only_inspection');
 const other=await context('other');assert([403,404].includes((await other.request.get(`${base}/api/workspace/media?lessonId=${f.lessonId}`)).status()));ok('other_synthetic_user_denied');
 if(real){
  stage='create_integration_lesson';const title='Real media integration '+new Date().toISOString();const result=await c.request.patch(api,{headers:{Origin:base},data:{action:'create_lesson',moduleId:f.moduleId,content:{title,summary:'Synthetic nonproduction media verification',content:'This private lesson verifies the actual configured test providers.',contentFormat:'plain_text'}}});assert.equal(result.status(),200);const tree=(await result.json()).tree,lesson=tree.lessons.find(l=>l.title===title);assert(lesson);
  report.integrationLessonId=lesson.id;await p.reload({waitUntil:'networkidle'});await p.getByRole('button',{name:title,exact:true}).click();await p.getByRole('heading',{name:'Lesson media',exact:true}).waitFor();
  const samples=path.join(t.root,'output/workspace-phase19-samples');
  async function upload(name,kind){
   stage='browser_upload_'+kind;await p.getByLabel('Add media',{exact:false}).selectOption(kind);
   const authorized=p.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/upload')&&r.request().method()==='POST',{timeout:120000});
   const finalized=p.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/finalize')&&r.request().method()==='POST',{timeout:120000});
   const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'Choose file',exact:true}).click();await (await chooser).setFiles(path.join(samples,name));
   const authorization=await authorized;assert.equal(authorization.status(),200);const lease=(await authorization.json()).upload;
   const response=await finalized;assert.equal(response.status(),200);const receipt=await response.json();
   const replay=await fetch(lease.url,{method:'PUT',headers:lease.headers,body:fs.readFileSync(path.join(samples,name)),redirect:'error',signal:AbortSignal.timeout(30000)});assert.equal(replay.status,412);
   await p.waitForFunction(()=>!document.querySelector('[aria-label="Lesson media"]')?.getAttribute('aria-busy')||document.querySelector('[aria-label="Lesson media"]')?.getAttribute('aria-busy')==='false');
   return receipt.asset;
  }
  const video=await upload('01-flight-demo.mp4','video');assert.equal(video.status,'verified');ok('real_browser_s3_put_cors_and_upload_verification');
  stage='mediaconvert_processing';await p.getByRole('button',{name:'Start processing',exact:true}).click();const deadline=Date.now()+15*60000;let ready=false;
  while(Date.now()<deadline){const response=await c.request.get(`${base}/api/workspace/media/${video.id}`);assert.equal(response.status(),200);const a=(await response.json()).asset;if(a.status==='ready'){ready=true;break;}assert.notEqual(a.status,'failed');await new Promise(r=>setTimeout(r,5000));}
  assert(ready);stage='select_ready_video';await p.getByRole('button',{name:'Select ready video',exact:true}).click({timeout:90000});ok('actual_mediaconvert_job_complete_then_explicit_video_selection');
  for(const name of ['notes.pdf','diagram.png','photo.jpg']){await upload(name,'resource');await p.locator('li').filter({has:p.getByText(name,{exact:true})}).getByRole('button',{name:'Attach to lesson',exact:true}).click();}
  const caption=await upload('english.vtt','caption');await p.locator('li').filter({has:p.getByText('english.vtt',{exact:true})}).getByRole('button',{name:'Attach to lesson',exact:true}).click();ok('real_pdf_png_jpeg_and_source_bound_caption_uploads');
  stage='pinned_evidence';const load=t.createLoader({'server-only':{}}),provider=load('@/lib/workspace/media/provider').s3MediaStorage(load('@/lib/workspace/media/provider').mediaStorageConfig());
  const {drizzle}=t.req('drizzle-orm/postgres-js'),schema=load('@/lib/db/schema'),{eq}=t.req('drizzle-orm'),rows=await drizzle(t.client,{schema}).select().from(schema.workspaceCourseAssets).where(eq(schema.workspaceCourseAssets.lessonId,lesson.id));
  for(const a of rows){const name=a.id===video.id?'01-flight-demo.mp4':a.id===caption.id?'english.vtt':a.displayName;const expected=createHash('sha256').update(fs.readFileSync(path.join(samples,name))).digest('hex'),inspection=await provider.inspect(a);assert.equal(a.checksum,expected);assert.equal(inspection.checksum,expected);assert.equal(inspection.versionId,a.objectVersionId);}
  const source=rows.find(a=>a.id===video.id),shortLease=await provider.authorize(source,source.checksum,1);await new Promise(r=>setTimeout(r,3000));const expired=await fetch(shortLease.url,{method:'PUT',headers:shortLease.headers,body:fs.readFileSync(path.join(samples,'01-flight-demo.mp4')),redirect:'error',signal:AbortSignal.timeout(30000)});assert.equal(expired.status,403);
  ok('actual_s3_identity_sha256_nonnull_versions_conditional_replay_and_expired_lease');
  stage='private_hls_playback';await p.getByRole('button',{name:'Preview saved lesson',exact:true}).click();const v=p.locator('video');await v.waitFor();await p.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.readyState>=2&&v.videoWidth>0;},null,{timeout:120000});await v.evaluate(el=>el.play());await p.waitForFunction(()=>document.querySelector('video').currentTime>1,{},{timeout:30000});await v.evaluate(el=>{el.pause();el.currentTime=1;if(el.textTracks[0])el.textTracks[0].mode='showing';});await p.waitForFunction(()=>document.querySelector('video').textTracks[0]?.activeCues?.length>0,null,{timeout:30000});assert(await v.evaluate(el=>el.duration>=3&&el.duration<=6));await p.screenshot({path:path.join(dir,'real-private-hls-captions.png'),fullPage:true});ok('decoded_private_hls_video_and_active_caption_cue');
  stage='authenticated_resource_downloads';for(const name of ['notes.pdf','diagram.png','photo.jpg']){const preview=p.getByRole('article',{name:'Private lesson preview'}),download=p.waitForEvent('download');await preview.getByRole('link',{name:new RegExp(name.replace('.','\\.'))}).click();const file=await download;assert.equal(await file.failure(),null);assert.equal(createHash('sha256').update(fs.readFileSync(await file.path())).digest('hex'),createHash('sha256').update(fs.readFileSync(path.join(samples,name))).digest('hex'));}ok('authenticated_download_bytes_match_uploaded_pdf_and_images');
  const bad=await other.request.get(`${base}/api/workspace/media/${video.id}/stream/master.m3u8`);assert([403,404].includes(bad.status()));ok('private_hls_denied_to_other_user');report.realMedia=true;
 }
 report.completed=true;fs.writeFileSync(path.join(dir,real?'real-browser.json':'local-browser.json'),JSON.stringify(report,null,2));
}finally{if(!report.completed&&diagnosticPage)await diagnosticPage.screenshot({path:path.join(t.root,'output/audits/workspace-phase19-local/failed-browser.png'),fullPage:true}).catch(()=>undefined);await b?.close();await t?.client.end({timeout:2});}})().catch(()=>{console.error('Founder browser verification failed at '+stage+'; private provider details and URLs suppressed.');process.exitCode=1;});
