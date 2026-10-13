'use client';
import { WorkspaceAgreement } from './WorkspaceAgreement';
import Link from 'next/link';
import { CURRENT_REFUND_POLICY, refundPolicyHref } from '@/lib/workspace/refund-policy/document';

export type RefundPolicyReceipt = { policyVersion: string; policyContentHash: string; acceptedAt: string };
export function isCurrentPolicyReceipt(receipt?: RefundPolicyReceipt | null) {
  return !!receipt && receipt.policyVersion === CURRENT_REFUND_POLICY.version && receipt.policyContentHash === CURRENT_REFUND_POLICY.contentHash && Number.isFinite(Date.parse(receipt.acceptedAt)) && Date.parse(receipt.acceptedAt) >= Date.parse(CURRENT_REFUND_POLICY.effectiveAt);
}
export function RefundPolicyAcceptance({onAccepted,initialAcceptance}:{onAccepted:(accepted:boolean)=>void;initialAcceptance?:RefundPolicyReceipt|null}){return <WorkspaceAgreement id="refund-policy" endpoint="/api/workspace/refund-policy/accept" hash={CURRENT_REFUND_POLICY.contentHash} previouslySaved={isCurrentPolicyReceipt(initialAcceptance)} validate={receipt=>!!receipt&&typeof receipt==='object'&&isCurrentPolicyReceipt(receipt as RefundPolicyReceipt)} onAccepted={onAccepted} label={<>I have read and agree to the AirBharath Workspace <Link href={refundPolicyHref()} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Refund Policy</Link> (opens in a new tab).</>}/>}
