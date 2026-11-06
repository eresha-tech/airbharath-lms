'use client';
import { useState,useRef,useEffect,type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { SETTLEMENT_COPY } from '@/lib/creator-payments/model';
const input='min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring';
export function FinanceAction({creatorId,entityId,actions,payee=false,approval=false,adjustment=false}:{creatorId:string;entityId?:string;actions:{value:string;label:string}[];payee?:boolean;approval?:boolean;adjustment?:boolean}) {
 const [ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);
 const pending=useRef<{payload:string;key:string}|null>(null);
 const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[details,setDetails]=useState<{holder:string;account:string;ifsc:string}|null>(null);
 async function submit(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();if(busy)return;setBusy(true);setMessage('');setDetails(null);
  const form=event.currentTarget,data=new FormData(form),body:Record<string,unknown>={creatorId,entityId,requestKey:crypto.randomUUID(),action:data.get('action')??'save_payee'};
  if(payee)Object.assign(body,{holder:data.get('holder'),account:data.get('account'),ifsc:data.get('ifsc'),acknowledged:data.get('acknowledged')==='on'});
  else Object.assign(body,{evidence:data.get('evidence'),...(approval?{amountPaise:Math.round(Number(data.get('amount'))*100)}:{}),...(adjustment?{adjustmentPaise:Math.round(Number(data.get('amount'))*100)}:{}),...(data.get('bankReference')?{bankReference:data.get('bankReference')}: {})});
  const payload=JSON.stringify({...body,requestKey:undefined});
  if(pending.current?.payload!==payload)pending.current={payload,key:crypto.randomUUID()};
  body.requestKey=pending.current.key;
  try {
   const response=await fetch(payee?'/api/workspace/earnings':'/api/admin/creator-settlements',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();if(!response.ok)throw new Error(result.error??'Request could not be saved.');
   pending.current=null;
   if(result.details)setDetails(result.details);setMessage(result.replayed?'Already recorded.':'Saved.');if(payee)form.reset();router.refresh();
  }catch(error){setMessage(error instanceof Error?error.message:'Request could not be confirmed. Reload the history before retrying.');}finally{setBusy(false);}
 }
 return <form method="post" onSubmit={submit} className="ph-no-capture space-y-4" aria-busy={busy} autoComplete="off"><fieldset disabled={busy||!ready} className="space-y-4">{payee?<><p className="text-sm leading-7 text-muted-foreground">{SETTLEMENT_COPY}</p><label className="block space-y-2 text-sm"><span>Account holder legal name</span><input name="holder" required minLength={2} maxLength={100} className={input}/></label><label className="block space-y-2 text-sm"><span>Bank account number</span><input name="account" required pattern="[0-9]{9,18}" inputMode="numeric" className={input}/></label><label className="block space-y-2 text-sm"><span>IFSC</span><input name="ifsc" required pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}" maxLength={11} className={input}/></label><label className="flex items-start gap-3 text-sm leading-6"><input name="acknowledged" type="checkbox" required className="mt-1 size-4"/>I own or am authorized to receive funds into this account and accept the displayed monthly bank settlement policy.</label></>:<><label className="block space-y-2 text-sm"><span>Action</span><select name="action" className={input}>{actions.map(a=><option key={a.value} value={a.value}>{a.label}</option>)}</select></label>{(approval||adjustment)&&<label className="block space-y-2 text-sm"><span>{adjustment?'Exact signed statement correction (INR)':'Amount (INR)'}</span><input name="amount" type="number" min={adjustment?'-1000000':'0.01'} max="1000000" step="0.01" required className={input}/></label>}<label className="block space-y-2 text-sm"><span>Evidence reference / review reason</span><input name="evidence" required minLength={5} maxLength={300} className={input}/></label>{!approval&&actions.some(a=>['initiate_payout','confirm_payout'].includes(a.value))&&<label className="block space-y-2 text-sm"><span>{actions.some(a=>a.value==='initiate_payout')?'Bank UTR / transfer reference (required for initiation)':'Traced bank UTR (only if previously unknown)'}</span><input name="bankReference" minLength={6} maxLength={100} className={input}/></label>}</>}<button className="min-h-11 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy?'Saving…':payee?'Save bank details and accept policy':'Record action'}</button></fieldset>{message&&<p role="status" className="text-sm leading-6">{message}</p>}{details&&<div className="rounded-lg border p-4 text-sm"><p>Authorized bank details — close after use</p><p>{details.holder}</p><p>{details.account}</p><p>{details.ifsc}</p><button type="button" onClick={()=>setDetails(null)} className="mt-3 min-h-11 underline">Hide bank details</button></div>}</form>;
}
