import { UUID } from '../eligibility/model';
import { addCalendarMonthsIST } from '../activation/model';
export const GRANT_SOURCE='admin_complimentary' as const;
export const GRANT_SCOPE='creator_workspace' as const;
export type GrantEnvironment='development'|'test'|'production';
export type GrantStatus='active'|'revoked'|'expired';
export type GrantEvidence={id:string;userId:string;source:string;scope:string;environment:string;status:GrantStatus;startsAt:Date;expiresAt:Date;createdAt:Date;closedAt:Date|null;profileStatus:string;eligibilityValid:boolean;termsAccepted:boolean;legalHistory:boolean};
export class GrantError extends Error{constructor(public code:'validation'|'forbidden'|'not_found'|'ineligible'|'duplicate'|'conflict'|'unavailable'){super(code)}}
function object(value:unknown){if(!value||typeof value!=='object'||Array.isArray(value))throw new GrantError('validation');return value as Record<string,unknown>}
function exact(input:Record<string,unknown>,keys:string[]){if(Object.keys(input).some(k=>!keys.includes(k)))throw new GrantError('validation')}
function reason(value:unknown){if(typeof value!=='string')throw new GrantError('validation');const s=value.trim();if(s.length<10||s.length>1000||/[<>\u0000-\u001f\u007f]/.test(s))throw new GrantError('validation');return s}
function id(value:unknown){if(typeof value!=='string'||!UUID.test(value))throw new GrantError('validation');return value}
function date(value:unknown){if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value)throw new GrantError('validation');return value}
export function grantCommand(raw:unknown){const r=object(raw);exact(r,['targetUserId','requestKey','reason','startsAt','durationMonths','expiresAt']);const durationMonths=r.durationMonths===undefined||r.durationMonths===null?null:Number(r.durationMonths);if(durationMonths!==null&&(![3,6,12].includes(durationMonths)||typeof r.durationMonths!=='number'))throw new GrantError('validation');const expiresAt=r.expiresAt===undefined||r.expiresAt===null?null:date(r.expiresAt);if((durationMonths===null)===(expiresAt===null))throw new GrantError('validation');return{targetUserId:id(r.targetUserId),requestKey:id(r.requestKey),reason:reason(r.reason),startsAt:r.startsAt===undefined||r.startsAt===null?null:date(r.startsAt),durationMonths,expiresAt}}
export function revokeCommand(raw:unknown){const r=object(raw);exact(r,['requestKey','reason','confirmed']);if(r.confirmed!==true)throw new GrantError('validation');return{requestKey:id(r.requestKey),reason:reason(r.reason)}}
export function grantTerm(command:ReturnType<typeof grantCommand>,now:Date){const startsAt=command.startsAt?new Date(command.startsAt):now;const expiresAt=command.expiresAt?new Date(command.expiresAt):addCalendarMonthsIST(startsAt,command.durationMonths!);if(startsAt<now||startsAt.getTime()>now.getTime()+30*86400000||expiresAt<=startsAt||expiresAt>addCalendarMonthsIST(startsAt,12))throw new GrantError('validation');return{startsAt,expiresAt}}
export function grantEnvironment(value:string|undefined):GrantEnvironment{if(!['development','test','production'].includes(value||''))throw new GrantError('unavailable');return value as GrantEnvironment}
export function resolveComplimentaryAccess(grant:GrantEvidence|null|undefined,now:Date,environment:string|undefined){
 const valid=!!grant&&grant.source===GRANT_SOURCE&&grant.scope===GRANT_SCOPE&&grant.environment===environment&&grant.profileStatus==='enabled'&&grant.eligibilityValid&&grant.createdAt<=now&&grant.expiresAt>grant.startsAt;
 const state=!grant?'none':!valid?'ineligible':grant.status==='revoked'?'revoked':grant.status==='expired'||now>=grant.expiresAt?'expired':now<grant.startsAt?'scheduled':!grant.termsAccepted?'pending_legal':'active';
 return{state,active:valid&&state==='active',historical:valid&&grant.legalHistory&&now>=grant.startsAt,grantId:grant?.id||null};
}
