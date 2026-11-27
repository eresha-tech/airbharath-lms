import {resolveJourney} from '@/lib/workspace/eligibility/model';
import {NextResponse} from 'next/server';
import {getWorkspaceUser,getWorkspaceJourneyState} from '@/lib/workspace/eligibility/service';
import {getCurrentPlans} from '@/lib/workspace/membership/service';
import {PLAN_INTENT_COOKIE,selectedPlan,planEntry} from '@/lib/workspace/membership/plan-intent';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const url=new URL(request.url),plan=selectedPlan(url.searchParams.get('plan'));
 if(!plan||[...url.searchParams.keys()].some(k=>k!=='plan'))return NextResponse.json({error:'Choose a current Creator plan.'},{status:400,headers:{'Cache-Control':'no-store'}});
 try{
  if(process.env.NODE_ENV==='production'&&!process.env.NEXT_PUBLIC_BASE_URL)throw new Error('public_origin_required');
  const base=new URL(process.env.NEXT_PUBLIC_BASE_URL||request.url);if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash||base.pathname!=='/'||process.env.NODE_ENV==='production'&&base.protocol!=='https:')throw new Error('invalid_public_origin');
  const plans=await getCurrentPlans();if(!plans.some(p=>p.code===plan&&p.available))return NextResponse.redirect(new URL('/workspace/pricing?availability=changed',base.origin),303);
  const user=await getWorkspaceUser();const journey=user?await getWorkspaceJourneyState(user.id):null;
  const blocked=journey&&['financial_review','activation_pending','creator_unavailable'].includes(journey.state);
  const eligible=journey&&(journey.state==='eligibility_active'||resolveJourney(true,journey.attempt,new Date()).state==='eligibility_active');
  const destination=!user?`/login?callbackUrl=${encodeURIComponent(planEntry(plan))}`:blocked?'/workspace/member':eligible?'/workspace/activate'+(journey!.state==='eligibility_active'?'':'?renew=1'):journey!.hasCreatorAccess||['expired','refunded','complimentary','active','grant_expired'].includes(journey!.state)?'/workspace/apply?renew=1':journey!.destination;
  const reply=NextResponse.redirect(new URL(destination,base.origin),303);reply.headers.set('Cache-Control','no-store');reply.cookies.set(PLAN_INTENT_COOKIE,plan,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/workspace',maxAge:3600});return reply;
 }catch{return NextResponse.json({error:'Creator plans are temporarily unavailable. Return to Creator pricing and retry. No payment was made.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
