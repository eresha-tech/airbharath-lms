import { randomUUID } from 'node:crypto';
import { UUID } from '../eligibility/model';
import { codeDigest,emailDigest,generateEmailCode,requireOtpSecret } from './crypto';
import { EmailVerificationError,normalizeEmail } from './model';
import type { EmailStore } from './repository';
export interface VerificationEmailProvider { send(input:{challengeId:string;email:string;code:string}):Promise<'accepted'|'failed'|'uncertain'> }
export function createEmailVerificationService(store:EmailStore,provider:VerificationEmailProvider,secret:string,clock=()=>new Date()){
 requireOtpSecret(secret);
 const keys=(operation:'send'|'verify',userId:string,email:string,ip:string)=>[{key:emailDigest(secret,'rate',[operation,'user',userId]),max:operation==='send'?5:30,windowMs:operation==='send'?3600000:600000},{key:emailDigest(secret,'rate',[operation,'ip',ip]),max:operation==='send'?20:100,windowMs:operation==='send'?3600000:600000},...(operation==='send'?[{key:emailDigest(secret,'rate',['send','email',email]),max:5,windowMs:3600000}]:[])];
 function identity(userId:string,ip:string){if(!UUID.test(userId))throw new EmailVerificationError('authentication');if(!ip||ip.length>100)throw new EmailVerificationError('unavailable')}
 function check(result:{error?:string;retryAfter?:number}){if(result.error)throw new EmailVerificationError(result.error as 'invalid_code'|'limited'|'authentication',result.retryAfter)}
 return{
  status:(userId:string)=>store.status(userId,clock()),
  async request(userId:string,input:unknown,ip:string){identity(userId,ip);if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>k!=='email'))throw new EmailVerificationError('validation');const email=normalizeEmail((input as {email?:unknown}).email);if(!email)throw new EmailVerificationError('validation');const id=randomUUID(),code=generateEmailCode(),now=clock();const result=await store.issue(userId,email,id,codeDigest(secret,id,userId,email,code),keys('send',userId,email,ip),now);check(result);let state:'accepted'|'failed'|'uncertain';try{state=await provider.send({challengeId:id,email,code})}catch{state='uncertain'}await store.sent(userId,id,state,clock());if(state!=='accepted')throw new EmailVerificationError('unavailable');return store.status(userId,clock())},
  async confirm(userId:string,input:unknown,ip:string){identity(userId,ip);if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['challengeId','code'].includes(k)))throw new EmailVerificationError('validation');const {challengeId,code}=input as {challengeId?:unknown;code?:unknown};if(typeof challengeId!=='string'||!UUID.test(challengeId)||typeof code!=='string'||!/^\d{6}$/.test(code))throw new EmailVerificationError('validation');try{const result=await store.confirm(userId,challengeId,email=>codeDigest(secret,challengeId,userId,email,code),keys('verify',userId,'',ip),clock());check(result)}catch(error){const e=error as {code?:string;cause?:{code?:string}};if(e.code==='23505'||e.cause?.code==='23505')throw new EmailVerificationError('invalid_code');throw error}return store.status(userId,clock())},
 };
}
