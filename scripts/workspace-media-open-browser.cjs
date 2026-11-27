// CLI-only synthetic session setup. No web auth endpoint or privilege override.
const {localTarget}=require('./workspace-local-target.cjs');
const {fixture,session,browserRuntime}=require('./workspace-media-local-session.cjs');
(async()=>{let t,b;try{
 if(process.env.WORKSPACE_MEDIA_LOCAL_BROWSER!=='true')throw Error('local_browser_opt_in_required');
 const args=process.argv.slice(2);if(args.length>1||args.some(a=>!['creator','admin','other'].includes(a)))throw Error('invalid_role');
 t=await localTarget();const f=fixture(t),{chromium}=browserRuntime();
 b=await chromium.launch({executablePath:process.env.WORKSPACE_BROWSER_EXECUTABLE||'/usr/bin/google-chrome',headless:false});
 for(const role of args.length?args:['creator','admin']){
  const context=await b.newContext({viewport:{width:1366,height:900}});
  await context.addCookies([{name:'ab_session',value:await session(t,f,role),url:'http://localhost:3000',httpOnly:true,sameSite:'Lax'}]);
  const page=await context.newPage(),route=role==='creator'?`/workspace/courses/${f.draftId}/build`:role==='admin'?`/admin/workspace/course-builds/${f.projectId}`:'/workspace';
  await page.goto('http://localhost:3000'+route,{waitUntil:'domcontentloaded',timeout:120000});console.log(`Opened synthetic ${role} testing window: ${route}`);
 }
 await t.client.end({timeout:2});t=null;
 console.log('Creator and Admin sessions expire in two hours. Close these browser windows when finished. Phase 2.0 acceptance remains pending.');
 await new Promise(resolve=>b.on('disconnected',resolve));
}finally{await t?.client.end({timeout:2});}})().catch(()=>{console.error('Local synthetic browser setup refused/failed. Ensure the local app is running and DISPLAY/browser runtime are available; private details suppressed.');process.exitCode=1;});
