'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PendingLabel } from './ui/WorkspaceUI';
import { REFUND_REASONS } from '@/lib/workspace/refunds/reasons';
const labels={mistake:'Purchased by mistake',unsuitable:'Workspace is not suitable for my needs',technical:'Technical issue',changed_mind:'Changed my mind',other:'Other'};
export function RefundRequestForm({orderId}:{orderId:string}) {
 const router=useRouter(),key=useRef<string|null>(null),pending=useRef(false);
 const [reason,setReason]=useState('mistake'),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[submitted,setSubmitted]=useState(false);
 async function send(){
  if(pending.current||submitted)return;pending.current=true;setBusy(true);setMessage('');key.current||=crypto.randomUUID();
  try{const response=await fetch(`/api/workspace/refunds/${orderId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestKey:key.current,reason,note}),cache:'no-store',signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Your request could not be confirmed. Reload to check its status before retrying.');setSubmitted(true);setMessage('Refund request received. Your membership access is unchanged while AirBharath reviews it.');router.refresh();}
  catch(error){setMessage(error instanceof Error?error.message:'Your request could not be confirmed. Reload to check its status.');}finally{pending.current=false;setBusy(false);}
 }
 return <form className="ph-no-capture ph-sensitive mt-6 space-y-4" onSubmit={event=>{event.preventDefault();void send();}} aria-busy={busy}>
  <label className="block text-sm">Reason<select className="mt-2 block w-full rounded-xl border border-border bg-background p-3" value={reason} disabled={busy||submitted} onChange={event=>{setReason(event.target.value);key.current=null;}}>{REFUND_REASONS.map(value=><option key={value} value={value}>{labels[value]}</option>)}</select></label>
  <label className="block text-sm">Additional details (optional)<textarea className="mt-2 block w-full rounded-xl border border-border bg-background p-3" rows={3} value={note} maxLength={2000} disabled={busy||submitted} onChange={event=>{setNote(event.target.value);key.current=null;}}/><span className="mt-2 block text-xs text-muted-foreground">Do not include bank, card or UPI details.</span></label>
  <button disabled={busy||submitted} className="rounded-xl border border-primary bg-primary/10 px-5 py-3 text-sm font-semibold disabled:opacity-50">{busy?<PendingLabel>Submitting…</PendingLabel>:submitted?'Request received':'Request refund'}</button>
  {message&&<p role="status" className="text-sm leading-7">{message}</p>}
 </form>;
}
export function AdminRefundActions({orderId,decision,execution}:{orderId:string;decision:string;execution?:string|null}) {
 const router=useRouter(),pending=useRef(false);const [reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function act(action:string){if(!confirmed||pending.current)return;pending.current=true;setBusy(true);setMessage('');
  try{const response=await fetch(`/api/admin/workspace-refunds/${orderId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,confirmed:true,...(action==='reject'?{reason}: {})}),cache:'no-store',signal:AbortSignal.timeout(45000)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Action could not be confirmed. Reload the case.');setMessage(data.refund?.status||'Recorded. Reload to check processing.');setConfirmed(false);router.refresh();}
  catch(error){setMessage(error instanceof Error?error.message:'Action could not be confirmed. Reload the case.');}finally{pending.current=false;setBusy(false);}}
 return <section className="ph-no-capture ph-sensitive mt-5 space-y-4" aria-label="Refund decision" aria-busy={busy}>
  {decision==='requested'&&<label className="block text-sm">Reason required for rejection<textarea rows={2} maxLength={2000} value={reason} disabled={busy} onChange={event=>setReason(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background p-3"/></label>}
  {decision!=='rejected'&&execution!=='completed'&&<><label className="workspace-check-label flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)} className="workspace-checkbox"/>I confirm this action for the displayed membership payment.</label><div className="flex flex-wrap gap-3">{decision==='requested'?<><button disabled={!confirmed||busy} onClick={()=>void act('approve')} className="rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground disabled:opacity-50">Approve & initiate refund</button><button disabled={!confirmed||busy||!reason.trim()} onClick={()=>void act('reject')} className="rounded-xl border border-border px-4 py-3 text-sm disabled:opacity-50">Reject refund request</button></>:<><button disabled={!confirmed||busy} onClick={()=>void act('reconcile')} className="rounded-xl border border-border px-4 py-3 text-sm disabled:opacity-50">Reconcile provider state</button>{execution==='failed'&&<button disabled={!confirmed||busy} onClick={()=>void act('retry')} className="rounded-xl border border-border px-4 py-3 text-sm disabled:opacity-50">Retry after definitive failure</button>}</>}</div></>}
  {busy&&<p role="status" className="text-sm"><PendingLabel>Confirming the refund action. Please wait before retrying.</PendingLabel></p>}<p className="text-xs leading-6 text-muted-foreground">Approval and initiation do not confirm a completed refund. Paid access ends only after the full refund is verified.</p>{message&&<p role="status" className="text-sm leading-7">{message}</p>}
 </section>;
}
