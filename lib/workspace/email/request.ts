import { isIP } from 'node:net';
import { EmailVerificationError } from './model';
// Vercel overwrites X-Forwarded-For at its trusted edge. Arbitrary forwarding headers
// are never trusted in local/self-hosted mode. https://vercel.com/docs/headers/request-headers
export function emailClientIp(request:Request,env:Record<string,string|undefined>=process.env){if(env.VERCEL==='1'){const ip=request.headers.get('x-forwarded-for')?.trim();if(ip&&isIP(ip))return ip;throw new EmailVerificationError('unavailable')}if(env.NODE_ENV!=='production'&&['development','test'].includes(env.DATABASE_ENV||'')&&['localhost','127.0.0.1'].includes(new URL(request.url).hostname))return'local-loopback';throw new EmailVerificationError('unavailable')}
