// F.8 settled development images: actual optimizer responses, no image interception.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('/home/rishisingh1034/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {getImageSize}=require('next/dist/server/image-optimizer');
const base='http://localhost:4058',out='output/audits/workspace-f8',shots='output/playwright/workspace-f8';
const result={mode:'development/Turbopack',nativeOptimizerBypass:false,responses:[],pages:[],httpFormats:[],pageErrors:[],blockedExternal:0};
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'en-IN',reducedMotion:'reduce'});
 await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(!['GET','HEAD'].includes(r.method())||(u.origin!==base&&u.hostname!=='assets.airbharath.in')){result.blockedExternal++;return route.abort()}
  if(u.origin===base&&/^\/tmp\/workspace-f7b-app-[^/]+\/[a-z0-9.-]+\.woff2$/.test(u.pathname))return route.fulfill({status:200,contentType:'font/woff2',body:fs.readFileSync(fs.readFileSync('/tmp/workspace-f7b-app-path','utf8').trim()+'/'+u.pathname.split('/').pop())});return route.continue();});
 const p=await context.newPage();p.on('pageerror',e=>result.pageErrors.push(e.message));p.on('response',r=>{const u=new URL(r.url());if(u.pathname==='/_next/image')result.responses.push({status:r.status(),type:r.headers()['content-type'],width:Number(u.searchParams.get('w'))})});
 for(const width of [1440,1280,1024,768,390,320]){await p.setViewportSize({width,height:width<768?844:1000});for(const route of ['/','/workspace']){
  const response=await p.goto(base+route,{waitUntil:'networkidle',timeout:60000});assert.equal(response.status(),200);await p.evaluate(()=>document.fonts.ready);
  const images=p.locator('img');for(let i=0;i<await images.count();i++)await images.nth(i).scrollIntoViewIfNeeded();await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0),{},{timeout:30000});
  const data=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,images:[...document.images].map(i=>({source:new URL(i.currentSrc,location.href).pathname,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,displayWidth:i.getBoundingClientRect().width,displayHeight:i.getBoundingClientRect().height,loaded:i.complete&&i.naturalWidth>0}))}));assert(!data.overflow);result.pages.push({route,width,...data});
  if(route==='/'&&width===1440){for(let i=0;i<await p.locator('.public-course-card').count();i++)await p.locator('.public-course-card').nth(i).screenshot({path:shots+'/course-artwork-'+i+'.png'});}
  await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:shots+`/${route==='/'?'home':'workspace'}-${width}-native-settled.png`,fullPage:width===390,animations:'disabled'});
 }}
 for(const format of ['image/avif','image/webp']){const path='/_next/image?url='+encodeURIComponent('https://assets.airbharath.in/eresha-logo.webp')+'&w=128&q=75';const r=await context.request.get(base+path,{headers:{Accept:format}});assert.equal(r.status(),200);assert.equal(r.headers()['content-type'],format);const body=await r.body(),size=await getImageSize(body,format);assert(size.width>0&&size.width<=128&&size.height>0);result.httpFormats.push({format,status:200,bytes:body.length,...size});}
 assert.equal(result.pageErrors.length,0);assert(result.responses.every(r=>r.status===200&&r.type==='image/avif'));assert.equal((await context.request.get(base+'/')).status(),200);result.serverAliveAfterImages=true;result.complete=true;
 fs.writeFileSync(out+'/native-development-images.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({complete:true,pages:result.pages.length,responses:result.responses.length,httpFormats:result.httpFormats,bypass:false}));
 }finally{await browser.close();if(!result.complete)fs.writeFileSync(out+'/native-development-images.json',JSON.stringify(result,null,2)+'\n')}})().catch(e=>{console.error(JSON.stringify({failed:true,name:e.name,message:e.message.split('\n')[0]}));process.exitCode=1});
