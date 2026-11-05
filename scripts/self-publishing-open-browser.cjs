// Synthetic sessions only, confined to the disposable self-publishing fixture.
const fs=require('node:fs'),assert=require('node:assert/strict'),{createHmac}=require('node:crypto');
const {req}=require('../tests/postgres/workspace-financial-loader.cjs'),{browserRuntime}=require('./workspace-media-local-session.cjs');
if(process.env.SELF_PUBLISHING_OPEN_BROWSER!=='true')throw Error('SELF_PUBLISHING_OPEN_BROWSER=true required.');
const f=JSON.parse(fs.readFileSync('/tmp/airbharath-self-publishing/fixture.json'));const root=fs.realpathSync(f.root);assert.match(root,/^\/tmp\/airbharath-media-pg-self-publishing-[A-Za-z0-9_-]+$/);assert.match(f.database,/^phase19b_[a-f0-9]{32}$/);
const seed=fs.readFileSync(root+'/self-publishing-test-seed','utf8'),origin='http://localhost:3000';
const requested=process.argv.slice(2);const roles=requested.length?requested:['learner','admin','creator'];assert(roles.every(r=>['learner','admin','creator','buyer','other'].includes(r)));
(async()=>{const db=req('postgres')({host:root+'/socket',port:55439,user:'phase19b',database:f.database,max:1,prepare:false});let browser;
 try {
  const [identity]=await db`select current_setting('data_directory') directory,inet_server_addr() address`;assert.equal(fs.realpathSync(identity.directory),root+'/data');assert.equal(identity.address,null);
  browser=await browserRuntime().chromium.launch({executablePath:'/usr/bin/google-chrome',headless:false,args:['--no-sandbox']});
  for(const role of roles){const id=role==='admin'?f.adminId:role==='creator'?f.owner:role==='learner'?(f.browserBuyer??f.learner):role==='buyer'?f.other:f.other;const [user]=await db`select id,role,full_name from users where id=${id}`;assert(user?.full_name.startsWith('SYNTHETIC '));assert.equal(user.role,role==='admin'?'admin':'student');
   const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.route('**/*',r=>(r.request().url().startsWith(origin)||new URL(r.request().url()).hostname==='airbharath-workspace-uat-dev01.s3.ap-south-1.amazonaws.com')?r.continue():r.fulfill({status:200,contentType:'application/javascript',body:''}));
   const token=await new(req('jose').SignJWT)({id,role:user.role,fullName:user.full_name,phone:''}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('2h').sign(new TextEncoder().encode(seed));await context.addCookies([{name:'ab_session',value:token,url:origin,httpOnly:true,sameSite:'Lax'}]);
   const page=await context.newPage();await page.exposeFunction('syntheticCheckout',orderId=>{assert.match(orderId,/^order_[a-f0-9]{32}$/);const payment='pay_'+orderId.slice(6);return {razorpay_order_id:orderId,razorpay_payment_id:payment,razorpay_signature:createHmac('sha256',seed).update(orderId+'|'+payment).digest('hex')};});
   await page.addInitScript(()=>{window.Razorpay=class {constructor(options){this.options=options;}on(){}async open(){await this.options.handler(await window.syntheticCheckout(this.options.order_id));}};});
   const route=role==='admin'?`/admin/workspace/publishing/${f.browserProject??f.projectId}`:role==='creator'?'/workspace/dashboard':`/dashboard/courses/${f.browserCourse??f.courseId}`;await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:120000});console.log('Opened synthetic '+role+' window.');
  }
  await db.end();const stop=async()=>{await browser.close();process.exit(0);};process.on('SIGINT',stop);process.on('SIGTERM',stop);process.stdin.resume();
 }catch(e){await browser?.close();await db.end({timeout:1});throw e;}
})().catch(e=>{console.error('Synthetic browser setup failed: '+(e.code||e.name));process.exitCode=1;});
