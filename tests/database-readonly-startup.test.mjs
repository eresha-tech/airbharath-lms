import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Duplex } from 'node:stream';
import postgres from 'postgres';
import { safeDiagnostic } from '../scripts/database-readonly-diagnostics.mjs';
import { preflightConfiguration } from '../scripts/database-readonly-preflight-core.mjs';

// All driver protocol traffic uses the supplied in-memory Duplex socket.
const i32=x=>{const b=Buffer.alloc(4);b.writeInt32BE(x);return b;};
const i16=x=>{const b=Buffer.alloc(2);b.writeInt16BE(x);return b;};
const str=x=>Buffer.from(x+'\0');
const frame=(type,body=Buffer.alloc(0))=>Buffer.concat([Buffer.from(type),i32(body.length+4),body]);
const ready=state=>frame('Z',Buffer.from(state));
const command=x=>frame('C',str(x));
const parameter=(k,v)=>frame('S',Buffer.concat([str(k),str(v)]));
class MockServer extends Duplex {
  constructor(scenario){super();this.scenario=scenario;this.startup=false;this.queries=[];this.readOnly=false;this.terminated=false;this.incoming=[];}
  get readyState(){return this.destroyed?'closed':'open';}
  setKeepAlive(){}
  _read(){}
  send(frames){queueMicrotask(()=>{if(!this.destroyed)this.push(Buffer.concat(frames));});}
  _final(callback){this.push(null);callback();this.destroy();}
  _write(bytes,encoding,callback){
    if(!this.startup){
      this.startup=true;
      const body=bytes.subarray(8).toString().split('\0');
      const settings={};for(let j=0;j<body.length-1;j+=2)settings[body[j]]=body[j+1];
      this.requestedReadOnly=settings.default_transaction_read_only==='true';
      if(this.scenario.authError){this.send([frame('E',Buffer.concat([Buffer.from('S'),str('FATAL'),Buffer.from('C'),str('28P01'),Buffer.from('M'),str('synthetic offline authentication refusal'),Buffer.from([0])]))]);callback();return;}
      const frames=[frame('R',i32(0)),parameter('server_version','16.15'),parameter('client_encoding','UTF8')];
      if(!this.scenario.missingFlags)frames.push(parameter('default_transaction_read_only',this.scenario.defaultReadOnly?'on':'off'),parameter('in_hot_standby','off'));
      frames.push(frame('K',Buffer.concat([i32(1234),i32(5678)])));
      this.incoming.push('AuthenticationOk','ParameterStatus','BackendKeyData');
      if(this.scenario.reset){this.send(frames);setImmediate(()=>this.destroy(Object.assign(new Error('Synthetic reset'),{code:'ECONNRESET'})));}
      else {if(!this.scenario.missingReady){frames.push(ready('I'));this.incoming.push('ReadyForQuery');}this.send(frames);}
      callback();return;
    }
    const responses=[];
    for(let pos=0;pos<bytes.length;){
      const type=String.fromCharCode(bytes[pos]),size=bytes.readInt32BE(pos+1),body=bytes.subarray(pos+5,pos+1+size);pos+=1+size;
      if(type==='X'){this.terminated=true;queueMicrotask(()=>this.destroy());continue;}
      if(type==='Q')responses.push(...this.execute(body.toString().replace(/\0$/,'')));
      else if(type==='P'){this.extended=body.toString().split('\0')[1];this.queries.push(this.extended);responses.push(frame('1'));}
      else if(type==='D')responses.push(frame('n'));
      else if(type==='B')responses.push(frame('2'));
      else if(type==='E'){this.readOnly=false;responses.push(command(this.extended.toUpperCase()));}
      else if(type==='S')responses.push(ready(this.readOnly?'T':'I'));
      else throw Error('Unexpected offline protocol message');
    }
    if(responses.length)this.send(responses);callback();
  }
  execute(query){
    this.queries.push(query);
    if(query.startsWith('begin ')){if(this.scenario.rejectBegin)return[frame('E',Buffer.concat([Buffer.from('S'),str('ERROR'),Buffer.from('C'),str('25006'),Buffer.from('M'),str('synthetic transaction refusal'),Buffer.from([0])])),ready('I')];this.readOnly=query.includes('read only');return[command('BEGIN'),ready('T')];}
    if(query===fixedIdentity){
      const cols=['database','role','read_only'];
      const desc=frame('T',Buffer.concat([i16(cols.length),...cols.map(name=>Buffer.concat([str(name),i32(0),i16(0),i32(25),i16(-1),i32(-1),i16(0)]))]));
      const values=['offline_fixture','offline_audit',this.readOnly?'on':'off'];
      const row=frame('D',Buffer.concat([i16(values.length),...values.map(value=>Buffer.concat([i32(Buffer.byteLength(value)),Buffer.from(value)]))]));
      return[desc,row,command('SELECT 1'),ready('T')];
    }
    throw Error('Unexpected offline query');
  }
}
const fixedIdentity="select current_database() as database, current_user as role, current_setting('transaction_read_only') as read_only";
// Synthetic manifest only. socket/ssl overrides below are confined to this in-memory test.
const manifest={ALLOW_PRODUCTION_READONLY_PREFLIGHT:'true',DATABASE_ENV:'production',PREFLIGHT_CONNECTION_MODE:'direct',
  PREFLIGHT_EXPECTED_HOST:'ep-offline.us-east-2.aws.neon.tech',PREFLIGHT_EXPECTED_DATABASE:'offline_fixture',PREFLIGHT_EXPECTED_ROLE:'offline_audit',PREFLIGHT_MIGRATION_ROLE:'offline_migrator',
  PREFLIGHT_NEON_PROJECT_ID:'offline-project',PREFLIGHT_NEON_BRANCH_ID:'br-offline',
  PREFLIGHT_DATABASE_URL:'postgresql://offline_audit:synthetic-only@ep-offline.us-east-2.aws.neon.tech/offline_fixture?sslmode=verify-full'};
async function probe(scenario, oldSelector=false){
  const stream=new MockServer(scenario);
  const reviewed=preflightConfiguration(manifest).options;
  assert.equal(reviewed.ssl,'verify-full');assert.equal(reviewed.target_session_attrs,null);
  const sql=postgres({...reviewed,socket:()=>stream,ssl:false,connect_timeout:0.15,idle_timeout:1,max_lifetime:1,
    ...(oldSelector?{target_session_attrs:'read-only'}:{})});
  let diagnostic=null,result=null;
  try {result=await sql.begin('isolation level repeatable read read only',async tx=>(await tx.unsafe(fixedIdentity,[],{simple:true}))[0]);}
  catch(error){diagnostic=safeDiagnostic(error,'transaction_begin');}
  finally{await sql.end({timeout:0.1});stream.destroy();}
  return {diagnostic,result,stream};
}
test('old session selector rejects valid writable-default startup after ReadyForQuery without SQL',async()=>{
  const r=await probe({defaultReadOnly:false},true);
  assert.equal(r.diagnostic.driverCode,'CONNECTION_DESTROYED');assert.equal(r.diagnostic.category,'connection_failed');
  assert(r.stream.incoming.includes('ReadyForQuery'));assert.equal(r.stream.queries.length,0);
});
for(const scenario of [{defaultReadOnly:false},{defaultReadOnly:true},{missingFlags:true}]){
  test('corrected startup needs no driver readiness SQL: '+JSON.stringify(scenario),async()=>{
    const r=await probe(scenario);assert.equal(r.diagnostic,null);assert.equal(r.result.read_only,'on');
    assert.equal(r.stream.requestedReadOnly,true);
    assert.deepEqual(r.stream.queries,['begin isolation level repeatable read read only',fixedIdentity,'commit']);
  });
}
for(const [name,scenario,category,sqlstate,driverCode] of [
  ['authentication rejection',{authError:true},'authentication_failed','28P01',undefined],
  ['transport reset',{reset:true,defaultReadOnly:false},'connection_failed',null,'ECONNRESET'],
  ['missing ReadyForQuery',{missingReady:true,defaultReadOnly:false},'inspection_timeout',null,'CONNECT_TIMEOUT'],
  ['READ ONLY BEGIN rejection',{rejectBegin:true,defaultReadOnly:false},'query_failed','25006',undefined],
]) test(name+' cannot proceed to identity collection',async()=>{
  const r=await probe(scenario);assert.equal(r.result,null);assert.equal(r.diagnostic.category,category);
  assert.equal(r.diagnostic.sqlstate,sqlstate);assert.equal(r.diagnostic.driverCode,driverCode);
  assert(!r.stream.queries.includes(fixedIdentity));
});
