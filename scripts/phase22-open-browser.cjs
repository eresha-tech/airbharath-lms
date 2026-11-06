// Synthetic sessions only, confined to the disposable Phase 2.2 fixture.
const fs=require('node:fs'),assert=require('node:assert/strict'),{createHmac}=require('node:crypto');
const {req}=require('../tests/postgres/workspace-financial-loader.cjs'),{browserRuntime}=require('./workspace-media-local-session.cjs');
if(process.env.PHASE22_OPEN_BROWSER!=='true')throw Error('PHASE22_OPEN_BROWSER=true required.');
const f=JSON.parse(fs.readFileSync('/tmp/airbharath-phase22/fixture.json'));const root=fs.realpathSync(f.root);assert.match(root,/^\/tmp\/airbharath-media-pg-phase22-[A-Za-z0-9_-]+$/);assert.match(f.database,/^phase19b_[a-f0-9]{32}$/);
const seed=fs.readFileSync(root+'/phase22-test-seed','utf8'),origin=process.env.PHASE22_FINANCE_UX==='true'?'http://127.0.0.1:3023':'http://127.0.0.1:3022';
const requested=process.argv.slice(2);const roles=requested.length?requested:['creator','admin','admin2','learner'];assert(roles.every(r=>['learner','admin','admin2','creator','buyer','other'].includes(r)));
(async()=>{const db=req('postgres')({host:root+'/socket',port:55439,user:'phase19b',database:f.database,max:1,prepare:false});let browser;
 try {
  const [identity]=await db`select current_setting('data_directory') directory,inet_server_addr() address`;assert.equal(fs.realpathSync(identity.directory),root+'/data');assert.equal(identity.address,null);
  browser=await browserRuntime().chromium.launch({executablePath:'/usr/bin/google-chrome',headless:false,args:['--no-sandbox']});
  for(const role of roles){let id=role==='admin'?f.adminId:role==='creator'?f.owner:f.other;
   if(role==='admin2')id=(await db`select id from users where full_name='SYNTHETIC BANK CHECKER'`)[0].id;
   if(role==='learner'||role==='buyer'){id=require('node:crypto').randomUUID();await db`insert into users(id,full_name,role) values(${id},'SYNTHETIC FOUNDER PAYMENT LEARNER','student')`;}
  const [user]=await db`select id,role,full_name from users where id=${id}`;assert(user?.full_name.startsWith('SYNTHETIC '));assert.equal(user.role,['admin','admin2'].includes(role)?'admin':'student');
   const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.fulfill({status:200,contentType:'application/javascript',body:''}));
   const token=await new(req('jose').SignJWT)({id,authenticatedAt:Math.floor(Date.now()/1000),role:user.role,fullName:user.full_name,phone:''}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('2h').sign(new TextEncoder().encode(seed));await context.addCookies([{name:'ab_session',value:token,url:origin,httpOnly:true,sameSite:'Lax'}]);
   const page=await context.newPage();await page.exposeFunction('syntheticCheckout',async orderId=>{assert.match(orderId,/^order_[a-f0-9]{32}$/);const payment='pay_'+orderId.slice(6),[order]=await db`select amount from orders where razorpay_order_id=${orderId}`;assert(order);const file=root+'/phase22-provider.json',records=JSON.parse(fs.readFileSync(file));records[payment]={id:payment,order_id:orderId,amount:Math.round(Number(order.amount)*100),currency:'INR',status:'captured',amount_refunded:0,fee:236,tax:36};fs.writeFileSync(file,JSON.stringify(records),{mode:0o600});return {razorpay_order_id:orderId,razorpay_payment_id:payment,razorpay_signature:createHmac('sha256',seed).update(orderId+'|'+payment).digest('hex')};});
   await page.addInitScript(()=>{window.Razorpay=class {constructor(options){this.options=options;}on(){}async open(){const capture=await window.syntheticCheckout(this.options.order_id);if(!window.phase22NoReturn)await this.options.handler(capture);}};});
   if(process.env.PHASE22_TEST_NO_RETURN==='true')await page.addInitScript(()=>{window.phase22NoReturn=true;});
   const route=['admin','admin2'].includes(role)?'/admin/creator-settlements':role==='creator'?'/workspace/earnings':`/courses/${f.courseId}`;await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:120000});console.log('Opened synthetic '+role+' window.');
  }
  const stop=async()=>{await browser.close();await db.end({timeout:2});process.exit(0);};process.on('SIGINT',stop);process.on('SIGTERM',stop);process.stdin.resume();
 }catch(e){await browser?.close();await db.end({timeout:1});throw e;}
})().catch(e=>{console.error('Synthetic browser setup failed: '+(e.code||e.name));process.exitCode=1;});
