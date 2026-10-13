import 'server-only';
import { MAILERCLOUD_EMAIL_ENDPOINT,mailercloudEmailPayload } from '@/lib/mailercloud';
import { classifyWorkspaceRuntime } from '../payments/classification';
import { validNoticeEmail } from '../refund-notifications/configuration-core.mjs';
import { EmailVerificationError } from './model';
import type { VerificationEmailProvider } from './service';
export function createVerificationMailercloudAdapter(env:Record<string,string|undefined>=process.env,http:typeof fetch=fetch):VerificationEmailProvider{
 const ready=()=>['production','development','test'].includes(classifyWorkspaceRuntime(env))&&env.WORKSPACE_EMAIL_VERIFICATION_ENABLED==='true'&&env.WORKSPACE_EMAIL_SENDER_VERIFIED==='true'&&(env.MAILERCLOUD_API_KEY||'').length>=16&&validNoticeEmail(env.MAILERCLOUD_SENDER_EMAIL);
 if(!ready())throw new EmailVerificationError('unavailable');
 const key=env.MAILERCLOUD_API_KEY!,sender=env.MAILERCLOUD_SENDER_EMAIL!;
 return{async send(input){if(!ready()||env.MAILERCLOUD_API_KEY!==key||env.MAILERCLOUD_SENDER_EMAIL!==sender||!validNoticeEmail(input.email)||!/^\d{6}$/.test(input.code))return'failed';try{const text=`Your AirBharath Workspace email verification code is ${input.code}. It expires in 10 minutes. If you did not request this, ignore this email.`,response=await http(MAILERCLOUD_EMAIL_ENDPOINT,{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Authorization:key,'Content-Type':'application/json'},body:JSON.stringify(mailercloudEmailPayload({from:sender,fromName:'AirBharath Workspace',to:input.email,name:'Workspace creator',subject:'Verify your Workspace email',html:`<p>${text}</p>`,text,messageId:input.challengeId}))});const reader=response.body?.getReader();if(!reader)return'uncertain';let size=0;const chunks:Uint8Array[]=[];try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>16384){await reader.cancel();return'uncertain'}chunks.push(part.value)}}finally{reader.releaseLock()}let body:unknown;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{return'uncertain'}return response.ok&&!!body&&typeof body==='object'&&'status' in body&&body.status==='SUCCESS'&&'statusCode' in body&&body.statusCode===1000?'accepted':'uncertain'}catch{return'uncertain'}}};
}
