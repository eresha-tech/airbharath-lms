// Explicit opt-in, synthetic fixture only. Uses an already installed browser runtime.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{randomUUID}=require('node:crypto');
if(process.env.WORKSPACE_MEDIA_BROWSER_VERIFY!=='true'){console.log('Media browser verification disabled.');process.exit(0);}
const base='http://localhost:4069',f=JSON.parse(fs.readFileSync('/tmp/phase19c-browser-fixture.json'));
assert.match(f.database,/^phase19b_[a-f0-9]{32}$/);assert.match(f.root,/^\/tmp\/airbharath-media-pg-/);
const {req}=require('./workspace-financial-loader.cjs'),{chromium}=require(process.env.WORKSPACE_BROWSER_RUNTIME);
const result={checks:[],externalRequestsBlocked:0,errors:[]},shots='/tmp/phase19c-ui-screenshots';fs.mkdirSync(shots,{recursive:true});
const ok=name=>{result.checks.push(name);console.log('PASS '+name);};let browser;
(async()=>{try{
 const {SignJWT}=await import(req.resolve('jose'));const secret=new TextEncoder().encode(fs.readFileSync('/tmp/phase19c-ui-secret','utf8'));
 const token=async(id,role)=>new SignJWT({id,phone:'+910000000001',fullName:'Synthetic UI',role}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(secret);
 browser=await chromium.launch({executablePath:process.env.WORKSPACE_BROWSER_EXECUTABLE||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 async function context(id,role,viewport={width:1366,height:950}){const c=await browser.newContext({viewport});await c.route('**/*',r=>{const u=new URL(r.request().url());if(['localhost','127.0.0.1'].includes(u.hostname))return r.continue();result.externalRequestsBlocked++;return r.abort();});if(id)await c.addCookies([{name:'ab_session',value:await token(id,role),url:base,httpOnly:true,sameSite:'Lax'}]);return c;}
 const c=await context(f.owner,'student'),p=await c.newPage();p.on('pageerror',e=>result.errors.push(e.message));p.on('dialog',d=>d.accept(d.type()==='prompt'?'Renamed synthetic notes':undefined));
 const build=`${base}/workspace/courses/${f.draftId}/build`,api=`${base}/api/workspace/course-drafts/${f.draftId}/build`;
 await p.goto(build,{waitUntil:'networkidle',timeout:120000});await p.getByRole('button',{name:'Synthetic legacy text',exact:true}).click();await p.getByRole('heading',{name:'Lesson media',exact:true}).waitFor({timeout:60000});
 const text=p.getByLabel('Lesson text',{exact:false});await text.fill('# Synthetic private preview\n\nSaved **Markdown** lesson.');
 await p.getByLabel('Content format',{exact:true}).selectOption('markdown');
 // The format selection requires deliberate confirmation.
 const saved=p.waitForResponse(r=>r.url()===api&&r.request().method()==='PATCH');await p.getByRole('button',{name:'Save',exact:true}).click();assert.equal((await saved).status(),200);
 await p.reload({waitUntil:'networkidle'});await p.getByRole('button',{name:'Synthetic legacy text',exact:true}).click();await text.waitFor();await p.waitForFunction(()=>!document.querySelector('textarea[rows="16"]')?.disabled);assert.equal(await text.inputValue(),'# Synthetic private preview\n\nSaved **Markdown** lesson.');assert.equal(await p.getByLabel('Content format',{exact:true}).inputValue(),'markdown');ok('hydrated_creator_markdown_save_reload_preserves_saved_content');
 await p.getByRole('button',{name:'Preview saved lesson',exact:true}).click();await p.getByRole('article',{name:'Private lesson preview'}).getByRole('heading',{name:'Synthetic private preview'}).waitFor();ok('saved_private_preview_renders_markdown');
 const notes=p.getByRole('button',{name:'Rename',exact:true});await notes.first().click();await p.getByRole('link',{name:/Renamed synthetic notes/}).first().waitFor();ok('real_resource_rename_route_updates_saved_ui');
 const pendingCount=await p.getByRole('button',{name:'Resume same file',exact:true}).count();
 await text.fill('Unsaved copyable work stays here');const mediaChoice=p.getByRole('button',{name:'Choose file',exact:true});assert.equal(await mediaChoice.isDisabled(),true);assert((await p.innerText('body')).includes('Save your text before changing media.'));ok('unsaved_text_blocks_media_mutations_and_remains_copyable');
 const savedAgain=p.waitForResponse(r=>r.url()===api&&r.request().method()==='PATCH');await p.getByRole('button',{name:'Save',exact:true}).click();assert.equal((await savedAgain).status(),200);
 await p.getByRole('button',{name:'Choose file',exact:true}).waitFor({state:'visible'});
 await p.getByLabel('Choose private lesson file').setInputFiles({name:'synthetic.mp4',mimeType:'video/mp4',buffer:Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0,105,115,111,109])});
 await p.getByRole('alert').filter({hasText:/storage is temporarily unavailable/i}).waitFor();assert.equal(await text.inputValue(),'Unsaved copyable work stays here');ok('disabled_storage_upload_failure_retains_saved_text');
 const preview=await c.newPage();await preview.goto(`${base}/workspace/courses/${f.draftId}/preview`,{waitUntil:'networkidle'});await preview.getByRole('button',{name:'Synthetic legacy text',exact:true}).click();await preview.getByRole('article',{name:'Private lesson preview'}).waitFor();assert.equal(await preview.getByRole('button',{name:'Save',exact:true}).count(),0);assert.equal(await preview.locator('meta[name="robots"]').getAttribute('content'),'noindex, nofollow');ok('private_course_preview_is_saved_read_only_and_noindex');
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:path.join(shots,'creator-mobile.png'),fullPage:true});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));ok('hydrated_mobile_studio_no_document_overflow');
 const ac=await context(f.adminId,'admin'),ap=await ac.newPage();await ap.goto(`${base}/admin/workspace/course-builds/${f.projectId}`,{waitUntil:'networkidle',timeout:120000});await ap.getByRole('button',{name:'Synthetic legacy text',exact:true}).click();await ap.getByRole('heading',{name:'Lesson media',exact:true}).waitFor();assert.equal(await ap.getByRole('button',{name:'Choose file',exact:true}).count(),0);assert.equal(await ap.getByRole('button',{name:'Rename',exact:true}).count(),0);assert.equal(await ap.getByRole('button',{name:'Save',exact:true}).count(),0);await ap.getByRole('button',{name:'Preview saved lesson',exact:true}).click();await ap.getByRole('article',{name:'Private lesson preview'}).waitFor();await ap.screenshot({path:path.join(shots,'admin-desktop.png'),fullPage:true});ok('persisted_admin_hydrated_media_inspection_has_no_mutation_controls');
 const anonymous=await context(),wrong=await context(randomUUID(),'student');
 for(const session of [anonymous,wrong]){const response=await session.request.get(`${base}/api/workspace/media?lessonId=${f.lessonId}`);assert([401,403,404].includes(response.status()));}ok('anonymous_and_unknown_owner_cannot_read_private_media');
 const cross=await c.request.post(`${base}/api/workspace/media`,{headers:{Origin:'https://attacker.invalid'},data:{}});assert.equal(cross.status(),403);ok('cross_origin_write_rejected');
 const publicCourse=await c.request.get(`${base}/api/courses/${f.projectId}`);assert.notEqual(publicCourse.status(),200);ok('private_project_not_exposed_as_public_course');
 await text.fill('Keep this unsaved copy during concurrent edits');
 const fresh=(await (await c.request.get(`${api}?moduleId=${f.moduleId}&lessonId=${f.lessonId}`)).json()).lesson;
 assert.equal((await c.request.patch(api,{headers:{Origin:base},data:{action:'update_lesson',moduleId:f.moduleId,lessonId:f.lessonId,expectedVersion:fresh.version,content:{title:fresh.title,summary:fresh.summary,content:'Changed in another synthetic tab',contentFormat:'plain_text'}}})).status(),200);
 const media=(await (await c.request.get(`${base}/api/workspace/media?lessonId=${f.lessonId}`)).json()),resource=media.assets.find(a=>a.assetKind==='resource'&&a.isAttached);
 assert.equal((await c.request.patch(`${base}/api/workspace/media/${resource.id}`,{headers:{Origin:base},data:{action:'rename',expectedVersion:resource.version,expectedMediaRevision:media.mediaRevision,displayName:'Concurrent synthetic resource'}})).status(),200);
 await p.getByRole('alert').filter({hasText:'Saved lesson changed in another tab'}).waitFor({timeout:20000});
 const stale=p.waitForResponse(r=>r.url()===api&&r.request().method()==='PATCH');await p.getByRole('button',{name:'Save',exact:true}).click();assert.equal((await stale).status(),409);assert.equal(await text.inputValue(),'Keep this unsaved copy during concurrent edits');ok('background_media_refresh_cannot_hide_concurrent_text_conflict_or_erase_unsaved_work');
 assert.deepEqual(result.errors,[]);ok('no_creator_browser_runtime_errors');
 fs.writeFileSync('/tmp/phase19c-browser-results.json',JSON.stringify(result,null,2));
}finally{await browser?.close();}})().catch(e=>{console.error('MEDIA_BROWSER_VERIFY_FAILED '+e.message);fs.writeFileSync('/tmp/phase19c-browser-results.json',JSON.stringify(result,null,2));process.exitCode=1;});
