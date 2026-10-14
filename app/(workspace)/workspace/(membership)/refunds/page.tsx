import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getWorkspaceUser } from '@/lib/workspace/eligibility/service';
import { formatWorkspaceDate } from '@/lib/workspace/eligibility/model';
import { formatPaise } from '@/lib/workspace/membership/model';
import { listCreatorRefundOrders } from '@/lib/workspace/refunds/repository';
import { refundableOrder, refundStatus } from '@/lib/workspace/refunds/model';
import { RefundRequestForm } from '@/components/workspace/RefundActions';
export const dynamic='force-dynamic';
export const metadata={title:'Membership & refunds — AirBharath Workspace',robots:{index:false,follow:false}};
export default async function RefundsPage(){
 const user=await getWorkspaceUser();if(!user)redirect('/login?callbackUrl=%2Fworkspace%2Frefunds');
 let rows;try{rows=await listCreatorRefundOrders(user.id);}catch{return <div className="ph-no-capture mx-auto max-w-3xl py-2"><h1 className="font-outfit text-3xl">Refund status unavailable</h1><p role="status" className="mt-4">Your saved payment and request history are retained. Please reload later.</p><Link href="/workspace/refunds" className="mt-4 inline-flex min-h-11 items-center text-primary underline">Reload saved records</Link></div>;}
 const now=new Date();
 return <div className="ph-no-capture ph-sensitive mx-auto max-w-3xl space-y-8 py-2"><Link href="/workspace/member" className="text-sm underline">← Membership</Link><header><p className="text-xs uppercase tracking-widest text-primary">AirBharath Workspace</p><h1 className="mt-3 font-outfit text-4xl font-semibold">Membership & refunds</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">Request a full refund within 72 elapsed hours of successful payment. A timely request remains available for review afterward. <Link href="/workspace/refund-policy" className="underline">Read the Refund Policy</Link>.</p></header>
 {!rows.length&&<p className="rounded-2xl border border-border p-6">No Workspace membership payments yet.</p>}
 {rows.map(({order,request,attempt,completion})=>{let eligible=false;try{refundableOrder(order,now,!!completion);eligible=true;}catch{/* Server mutation rechecks authoritative DB time. */}
  const remaining=order.refundEligibleUntil?Math.max(0,Math.ceil((order.refundEligibleUntil.getTime()-now.getTime())/3600000)):0;
  return <section key={order.id} className="rounded-2xl border border-border bg-card p-6 sm:p-8"><h2 className="font-outfit text-2xl">{order.planSnapshot.displayName}</h2><dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">{[['Amount paid',order.financialState==='captured'?formatPaise(order.totalPaise):'Not paid'],['Successful payment',order.paidAt?formatWorkspaceDate(order.paidAt):'Timing not established'],['Request deadline',order.refundEligibleUntil?formatWorkspaceDate(order.refundEligibleUntil):'Not established'],['Order',order.id]].map(([label,value])=><div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl>
  {request||completion?<div className="mt-6 border-t border-border pt-5"><p className="font-medium">{refundStatus(request?.decision||'requested',attempt?.state,!!completion)}</p>{request&&<p className="mt-2 text-sm text-muted-foreground">Requested {formatWorkspaceDate(request.requestedAt)}</p>}{request?.rejectionReason&&<p className="mt-3 whitespace-pre-wrap text-sm">{request.rejectionReason}</p>}</div>:eligible?<><p className="mt-6 text-sm text-muted-foreground">Approximately {remaining} hours remain. The server checks the exact deadline when your request is recorded.</p><RefundRequestForm orderId={order.id}/></>:<p className="mt-6 text-sm text-muted-foreground">{order.refundEligibleUntil&&now>order.refundEligibleUntil?'Refund request window ended':'A standard refund request is not currently available for this payment.'}</p>}
  <p className="mt-6 text-xs leading-6 text-muted-foreground">For exceptional payment issues, contact <a href="mailto:academy@airbharath.in" className="underline">academy@airbharath.in</a>. An exception is not guaranteed.</p></section>;
 })}</div>;
}
