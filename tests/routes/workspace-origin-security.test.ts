import {beforeEach,expect,it,vi} from 'vitest';
import {isSameOrigin} from '@/lib/workspace/http';
const origin='https://staging.airbharath.in';
const request=(headers:Record<string,string>={},url='https://0.0.0.0:3000/api/workspace/course-drafts')=>new Request(url,{method:'POST',headers:{origin,host:'staging.airbharath.in','x-forwarded-proto':'https',...headers}});
beforeEach(()=>{vi.stubEnv('NEXT_PUBLIC_BASE_URL',origin);vi.stubEnv('NODE_ENV','production');});
it('accepts the configured external ALB HTTPS origin without retaining internal port 3000',()=>{
 expect(isSameOrigin(request())).toBe(true);
});
const attacks: Record<string,string>[] = [
 {origin:'https://foreign.invalid'},
 {host:'foreign.invalid'},
 {host:'foreign.invalid',origin:'https://foreign.invalid'},
 {'x-forwarded-host':'foreign.invalid'},
 {'x-forwarded-host':'foreign.invalid',origin:'https://foreign.invalid'},
 {'x-forwarded-proto':'http'},
 {'x-forwarded-proto':'https,http'},
 {'x-forwarded-host':'staging.airbharath.in,foreign.invalid'},
 {'x-forwarded-port':'3000'},
 {'x-forwarded-port':'443,3000'},
 {forwarded:'host=foreign.invalid;proto=https'},
 {origin:'http://staging.airbharath.in'},
 {origin:'https://staging.airbharath.in:3000'},
 {host:'staging.airbharath.in:3000'},
 {host:'staging.airbharath.in@foreign.invalid'},
 {host:'staging.airbharath.in/anything'},
 {host:'staging%2eairbharath.in'},
 {origin:'null'},
 {origin:'https://staging.airbharath.in/'},
 {origin:'https://user:password@staging.airbharath.in'},
 {'sec-fetch-site':'cross-site'},
];
it.each(attacks)('rejects untrusted origin or proxy metadata %j',headers=>{expect(isSameOrigin(request(headers))).toBe(false);});
it('accepts matching single proxy metadata and normalized default HTTPS Host port',()=>{
 expect(isSameOrigin(request({host:'staging.airbharath.in:443','x-forwarded-host':'staging.airbharath.in','x-forwarded-port':'443'}))).toBe(true);
});
it('uses exactly the configured nondefault port',()=>{
 vi.stubEnv('NEXT_PUBLIC_BASE_URL',origin+':8443/');
 expect(isSameOrigin(request({origin:origin+':8443',host:'staging.airbharath.in:8443','x-forwarded-host':'staging.airbharath.in:8443','x-forwarded-port':'8443'}))).toBe(true);
 expect(isSameOrigin(request())).toBe(false);
});
it.each(['https://staging.airbharath.in/path','https://user:password@staging.airbharath.in','https://staging.airbharath.in?x=y','https://staging.airbharath.in#fragment','not-a-url',''])('fails closed for invalid explicit configuration %s',value=>{
 vi.stubEnv('NEXT_PUBLIC_BASE_URL',value);expect(isSameOrigin(request())).toBe(false);
});
it('never turns an incoming Origin or proxy Host into the authorization source',()=>{
 delete process.env.NEXT_PUBLIC_BASE_URL;
 for(const key of ['VERCEL','VERCEL_ENV','VERCEL_URL','VERCEL_PROJECT_PRODUCTION_URL'])vi.stubEnv(key,undefined);
 expect(isSameOrigin(request({host:'foreign.invalid',origin:'https://foreign.invalid','x-forwarded-host':'foreign.invalid'}))).toBe(false);
});
it('preserves direct development with configured or request-URL ports and IPv6',()=>{
 vi.stubEnv('NODE_ENV','development');delete process.env.NEXT_PUBLIC_BASE_URL;
 for(const url of ['http://localhost:3000','http://127.0.0.1:3043','http://[::1]:3000']){
  const headers={origin:url,host:new URL(url).host};expect(isSameOrigin(new Request(url+'/api/action',{method:'POST',headers}))).toBe(true);
 }
 expect(isSameOrigin(new Request('http://localhost:3000/api/action',{method:'POST',headers:{origin:'http://foreign.invalid',host:'foreign.invalid'}}))).toBe(false);
});
it.each([
 ['production','lms.airbharath.in','VERCEL_PROJECT_PRODUCTION_URL'],
 ['preview','preview-fixture.vercel.app','VERCEL_URL'],
])('preserves explicitly configured Vercel %s deployment origins', (environment,host,key)=>{
 delete process.env.NEXT_PUBLIC_BASE_URL;vi.stubEnv('VERCEL','1');vi.stubEnv('VERCEL_ENV',environment);vi.stubEnv(key,host);
 expect(isSameOrigin(new Request('https://internal:3000/api/action',{method:'POST',headers:{origin:'https://'+host,host,'x-forwarded-proto':'https'}}))).toBe(true);
});
it('does not let Vercel defaults override an explicit application origin',()=>{
 vi.stubEnv('VERCEL','1');vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL','foreign.invalid');expect(isSameOrigin(request())).toBe(true);
 expect(isSameOrigin(request({host:'foreign.invalid',origin:'https://foreign.invalid'}))).toBe(false);
});
it('retains originless same-site media/server requests while rejecting spoofed metadata',()=>{
 const url='https://internal:3000/api/workspace/media';
 expect(isSameOrigin(new Request(url,{headers:{host:'staging.airbharath.in','x-forwarded-proto':'https'}}))).toBe(true);
 expect(isSameOrigin(new Request(url,{headers:{host:'foreign.invalid'}}))).toBe(false);
});
