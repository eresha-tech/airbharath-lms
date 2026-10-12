// Prepared transactional notice templates. An independently provisioned sender consumes the durable outbox.
// No address or free-text reason is copied into telemetry/provider notes or the outbox identity.
export function refundNotice(kind:'received'|'rejected'|'initiated'|'completed',rejectionReason?:string|null){
 const content={received:{subject:'Workspace refund request received',text:'AirBharath has received your refund request for review. Your membership access remains unchanged while the request is pending.'},rejected:{subject:'Workspace refund request rejected',text:`AirBharath reviewed and rejected your refund request. ${rejectionReason||'Sign in to view the recorded reason.'} Your paid membership term is unchanged.`},initiated:{subject:'Workspace refund initiated',text:'AirBharath approved your refund request and initiated processing through the original payment provider. This does not mean the refund has completed or reached your bank.'},completed:{subject:'Workspace refund completed',text:'The payment provider has authoritatively confirmed your full Workspace refund. Paid entitlement from this membership has ended; your creator work is retained. Bank or payment-source credit may take additional processing time.'}};
 return content[kind];
}
export async function bestEffortRefundNotice(send:()=>Promise<void>){try{await send();return true;}catch{return false;}}
