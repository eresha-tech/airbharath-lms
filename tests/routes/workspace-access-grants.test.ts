import {sanitizeWorkspaceAnalytics} from '@/lib/workspace/analytics-privacy';
import {describe,expect,it} from 'vitest';
import {grantCommand,grantTerm,revokeCommand,resolveComplimentaryAccess,type GrantEvidence} from '@/lib/workspace/access/model';
import {creatorCapabilities} from '@/lib/workspace/creator/model';
import {decodeCursor,encodeCursor,escapedSearch,listParams} from '@/lib/workspace/admin/pagination';
const now=new Date('2026-10-13T12:00:00.000Z'),id='00000000-0000-4000-8000-000000000001';
const command={targetUserId:id,requestKey:id,reason:'Synthetic complimentary preparation access',durationMonths:3};
const grant:GrantEvidence={id,userId:id,source:'admin_complimentary',scope:'creator_workspace',environment:'development',status:'active',startsAt:now,expiresAt:new Date('2027-01-13T12:00:00.000Z'),createdAt:now,closedAt:null,profileStatus:'enabled',eligibilityValid:true,termsAccepted:true,legalHistory:true};
describe('Complimentary access is independently resolved and fails closed',()=>{
 it('allows creator editing without paid entitlement or payment evidence',()=>expect(creatorCapabilities(null,now,'development',false,grant)).toMatchObject({hasCreatorAccess:true,hasPaidEntitlement:false,canEditWorkspace:true,accessSource:'complimentary'}));
 it.each([{status:'revoked' as const},{status:'expired' as const},{expiresAt:now},{startsAt:new Date(now.getTime()+1)},{termsAccepted:false},{eligibilityValid:false},{profileStatus:'suspended'},{source:'payment'},{scope:'admin'},{environment:'production'}])('does not grant editing for %j',change=>expect(creatorCapabilities(null,now,'development',false,{...grant,...change}).canEditWorkspace).toBe(false));
 it('revocation retains legal history but never editing',()=>expect(creatorCapabilities(null,now,'development',false,{...grant,status:'revoked'})).toMatchObject({canViewCreatorWorkspace:true,canEditWorkspace:false,hasPaidEntitlement:false}));
 it('missing legal history cannot create historical read access',()=>expect(creatorCapabilities(null,now,'development',false,{...grant,status:'revoked',legalHistory:false}).canViewCreatorWorkspace).toBe(false));
 it('unknown runtime denies grant editing',()=>expect(resolveComplimentaryAccess(grant,now,'unclassified').active).toBe(false));
});
describe('Grant commands have strict actors, reasons and mandatory expiry',()=>{
 it('uses calendar duration and does not silently extend the command',()=>{const parsed=grantCommand(command);expect(grantTerm(parsed,now)).toEqual({startsAt:now,expiresAt:grant.expiresAt});});
 it.each([{...command,actorId:id},{...command,durationMonths:0},{...command,durationMonths:'3'},{...command,durationMonths:undefined},{...command,expiresAt:grant.expiresAt.toISOString()},{...command,reason:'short'},{...command,targetUserId:'invalid'},{...command,reason:'Invalid <markup> reason'}])('rejects %j',input=>expect(()=>grantCommand(input)).toThrow());
 it.each([{startsAt:new Date(now.getTime()-1).toISOString()},{startsAt:new Date(now.getTime()+31*86400000).toISOString()},{durationMonths:null,expiresAt:now.toISOString()},{durationMonths:null,expiresAt:'2028-01-01T00:00:00.000Z'}])('rejects invalid actual term %j',input=>expect(()=>grantTerm(grantCommand({...command,...input}),now)).toThrow());
 it('revocation requires explicit confirmation and reason',()=>{expect(()=>revokeCommand({requestKey:id,reason:command.reason})).toThrow();expect(revokeCommand({requestKey:id,reason:command.reason,confirmed:true})).toMatchObject({requestKey:id});});
});
describe('Admin pagination is bounded and cursor context cannot be mixed',()=>{
 it('defaults to 25 and accepts supported 50',()=>{expect(listParams({})).toMatchObject({page:1,size:25,mode:'live'});expect(listParams({size:'50',q:'Flight',status:'active'}).size).toBe(50);});
 it.each([{page:'0'},{page:'501'},{page:'1.5'},{page:'1e2'},{size:'1000'},{q:'x'.repeat(121)},{page:['1','2']},{sort:'SQL'},{mode:'production'},{cursor:'x'.repeat(1201)}])('rejects invalid params %j',p=>expect(()=>listParams(p)).toThrow());
 it('escapes literal LIKE wildcards',()=>expect(escapedSearch('a%_\\')).toBe('%a\\%\\_\\\\%'));
 it('rejects malformed and wrong-context cursor',()=>{const c={anchor:now.toISOString(),time:now.toISOString(),id,signature:'server-query-context'};expect(decodeCursor(encodeCursor(c),c.signature)).toEqual(c);expect(()=>decodeCursor(encodeCursor(c),'different-filter')).toThrow();expect(()=>decodeCursor('malformed',c.signature)).toThrow();expect(()=>decodeCursor(Buffer.from(JSON.stringify({...c,secret:'unexpected'})).toString('base64url'),c.signature)).toThrow();});
});

it.each(['/admin/workspace','/admin/workspace/access-grants/'+id,'/admin/workspace/creators/'+id,'/admin/workspace/events/'+id])('new private admin path %s masks IDs, contact search and grant/financial data',path=>{const event={uuid:'synthetic',event:'$pageview',timestamp:now,properties:{$current_url:'https://example.test'+path+'?q=private-contact&user='+id,pathname:path,$device_id:'synthetic_device_01',distinct_id:id,grantId:id,email:'private-contact',reason:'private-reason',amountPaise:1000}};const safe=sanitizeWorkspaceAnalytics(event);expect(safe).not.toBeNull();expect(JSON.stringify(safe)).not.toMatch(/private-contact|private-reason|amountPaise|grantId/);expect(JSON.stringify(safe)).not.toContain(id);expect(safe?.properties.$process_person_profile).toBe(false);expect(sanitizeWorkspaceAnalytics({...event,event:'$autocapture'})).toBeNull();});
