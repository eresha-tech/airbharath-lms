import 'server-only';
import { createCipheriv,createDecipheriv,randomBytes } from 'node:crypto';
import { CommerceError } from '@/lib/commerce/model';
function key() {const raw=process.env.CREATOR_PAYEE_ENCRYPTION_KEY;if(!raw||!/^[a-f0-9]{64}$/i.test(raw))throw new CommerceError(503,'Payee encryption is not configured.');return Buffer.from(raw,'hex');}
export function encryptPayee(value:unknown,owner:string) {const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(),iv);c.setAAD(Buffer.from(owner));const bytes=Buffer.concat([c.update(JSON.stringify(value),'utf8'),c.final()]);return [iv,c.getAuthTag(),bytes].map(b=>b.toString('base64url')).join('.');}
export function decryptPayee(value:string,owner:string) {const [iv,tag,data]=value.split('.').map(s=>Buffer.from(s,'base64url'));const d=createDecipheriv('aes-256-gcm',key(),iv);d.setAAD(Buffer.from(owner));d.setAuthTag(tag);return JSON.parse(Buffer.concat([d.update(data),d.final()]).toString('utf8')) as {holder:string;account:string;ifsc:string};}
