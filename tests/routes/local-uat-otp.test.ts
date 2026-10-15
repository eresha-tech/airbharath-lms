import { expect, it } from 'vitest';
import { createLocalUatOtpStore, LOCAL_UAT_PHONES, localUatOtpMode, localUatRequestAllowed } from '@/lib/local-uat-otp';
import { OTP_RATE_LIMIT_POLICY } from '@/lib/otp-rate-limit';
import { normalizedIndianMobile } from '@/lib/phone-number';
const env = { NODE_ENV:'development',DATABASE_ENV:'development',DATABASE_URL:'postgresql://synthetic:synthetic@localhost:5433/airbharath_lms',WORKSPACE_LOCAL_UAT_OTP_ENABLED:'true' };
it('requires explicit mock flag and verified local development configuration',()=>{
 expect(localUatOtpMode({...env,WORKSPACE_LOCAL_UAT_OTP_ENABLED:undefined})).toBe('off'); expect(localUatOtpMode(env)).toBe('local');
 for(const more of [{NODE_ENV:'production'},{DATABASE_ENV:'production'},{DATABASE_ENV:'staging'},{DATABASE_ENV:'test'},{VERCEL:'1'},{VERCEL_ENV:'preview'},{WORKSPACE_LOCAL_UAT_OTP_ENABLED:'yes'},{DATABASE_URL:undefined}]) expect(localUatOtpMode({...env,...more})).toBe('blocked');
});
it.each(['postgres://synthetic:5433@remote.invalid/airbharath_lms','postgres://synthetic:synthetic@remote.invalid:5433/airbharath_lms','postgres://synthetic:synthetic@localhost:5432/airbharath_lms','postgres://synthetic:synthetic@localhost:5433/other'])('refuses a mismatched database target %s',DATABASE_URL=>expect(localUatOtpMode({...env,DATABASE_URL})).toBe('blocked'));
it('accepts only loopback requests and refuses cross-site or tunneled OTP requests',()=>{
 expect(localUatRequestAllowed(new Request('http://localhost:3000/api/auth/send-otp'))).toBe(true);
 for(const request of [new Request('https://public.invalid/api/auth/send-otp'),new Request('http://localhost:3000/api/auth/send-otp',{headers:{origin:'https://public.invalid'}}),new Request('http://localhost:3000/api/auth/send-otp',{headers:{'x-forwarded-host':'tunnel.trycloudflare.com'}})]) expect(localUatRequestAllowed(request)).toBe(false);
});
it('uses exactly the final owner-approved demos and rejects all former demos',()=>{
 expect(LOCAL_UAT_PHONES).toEqual(['919876543222','919000900009','919696969696']);
 const store=createLocalUatOtpStore();for(const phone of ['919876543211','919000090000','919123456780']){expect(store.send(phone)).toBe(false);expect(store.verify(phone,'1234')).toBe(false);}
});
it('only verifies the three owner-approved numbers, after issue, once, and before expiry',()=>{
 let time=1000;const store=createLocalUatOtpStore(()=>time);
 for(const phone of LOCAL_UAT_PHONES){expect(store.verify(phone,'1234')).toBe(false);expect(store.send(phone)).toBe(true);expect(store.verify(phone,'wrong')).toBe(false);expect(store.verify(phone,'1234')).toBe(true);expect(store.verify(phone,'1234')).toBe(false);store.send(phone);}
 time+=600_000;for(const phone of LOCAL_UAT_PHONES)expect(store.verify(phone,'1234')).toBe(false);
 expect(store.send('919876543210')).toBe(false);expect(store.verify('919876543210','1234')).toBe(false);expect(store.verify('919123456781','1234')).toBe(false);
});
it('retains resend cooldown, hourly send cap and verification attempt window without external Redis',()=>{
 let time=1000;const store=createLocalUatOtpStore(()=>time),phone=LOCAL_UAT_PHONES[0];
 expect(store.limit('send',phone,OTP_RATE_LIMIT_POLICY)).toEqual({status:'allowed'});expect(store.limit('send',phone,OTP_RATE_LIMIT_POLICY).status).toBe('limited');
 time+=30_000;expect(store.limit('send',phone,OTP_RATE_LIMIT_POLICY).status).toBe('allowed');
 for(let i=0;i<5;i++){time+=30_000;store.limit('send',phone,OTP_RATE_LIMIT_POLICY);}expect(store.limit('send',phone,OTP_RATE_LIMIT_POLICY).status).toBe('limited');
 for(let i=0;i<10;i++)expect(store.limit('verify',phone,OTP_RATE_LIMIT_POLICY).status).toBe('allowed');expect(store.limit('verify',phone,OTP_RATE_LIMIT_POLICY).status).toBe('limited');
 time+=600_000;expect(store.limit('verify',phone,OTP_RATE_LIMIT_POLICY).status).toBe('allowed');expect(store.limit('verify','919123456781',OTP_RATE_LIMIT_POLICY).status).toBe('unavailable');
});
it('rejects the owner invalid Indian number in shared normal validation',()=>{
 expect(normalizedIndianMobile('1234567890')).toBeNull();expect(normalizedIndianMobile(9876543211)).toBeNull();expect(normalizedIndianMobile('919876543211')).toBe('919876543211');expect(normalizedIndianMobile('+91 9876543211')).toBe('919876543211');
});
