const fs=require('node:fs'),assert=require('node:assert/strict');
const {req}=require('./workspace-financial-loader.cjs'),{browserRuntime}=require('../../scripts/workspace-media-local-session.cjs');
if(process.env.PHASE21_BROWSER_VERIFY!=='true')throw Error('PHASE21_BROWSER_VERIFY=true required');
const f=JSON.parse(fs.readFileSync('/tmp/airbharath-phase21/fixture.json'));const root=fs.realpathSync(f.root);assert.match(root,/^\/tmp\/airbharath-media-pg-phase21-[A-Za-z0-9_-]+$/);assert.match(f.database,/^phase19b_[a-f0-9]{32}$/);
(async()=>{let browser;const c=req('postgres')({host:root+'/socket',port:55439,user:'phase19b',database:f.database,max:1,prepare:false});try{
 const [identity]=await c`select current_setting('data_directory') directory,inet_server_addr() address`;assert.equal(fs.realpathSync(identity.directory),root+'/data');assert.equal(identity.address,null);
 const [author]=await c`select name from course_authors where course_id=${f.courseId} order by order_index,id limit 1`;
 browser=await browserRuntime().chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:3021')?r.continue():r.fulfill({status:200,body:''}));
 await page.goto('http://127.0.0.1:3021/courses?q=Synthetic+published',{waitUntil:'networkidle',timeout:120000});await page.getByText('By '+author.name,{exact:true}).waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:'output/audits/workspace-phase21/creator-card-desktop.png',fullPage:true});await page.setViewportSize({width:375,height:812});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 fs.writeFileSync('output/audits/workspace-phase21/browser-final-smoke.json',JSON.stringify({publicCreatorAttribution:true,desktop:true,mobileNoOverflow:true},null,2));console.log('PASS final public Creator attribution and responsive catalog');
}finally{await browser?.close();await c.end({timeout:2});}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
