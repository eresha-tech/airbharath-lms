'use client';
import { WorkspaceAgreement } from './WorkspaceAgreement';
import Link from 'next/link';
import { CURRENT_CREATOR_TERMS, creatorTermsHref } from '@/lib/workspace/terms/document';

export type CreatorTermsReceipt = { termsVersion: string; termsContentHash: string; acceptedAt: string };
export function isCurrentTermsReceipt(receipt?: CreatorTermsReceipt | null) {
  return !!receipt && receipt.termsVersion === CURRENT_CREATOR_TERMS.version && receipt.termsContentHash === CURRENT_CREATOR_TERMS.contentHash && Number.isFinite(Date.parse(receipt.acceptedAt)) && Date.parse(receipt.acceptedAt) >= Date.parse(CURRENT_CREATOR_TERMS.effectiveAt);
}
export function CreatorTermsAcceptance({onAccepted,initialAcceptance}:{onAccepted:(accepted:boolean)=>void;initialAcceptance?:CreatorTermsReceipt|null}){return <WorkspaceAgreement id="creator-terms" endpoint="/api/workspace/creator-terms/accept" hash={CURRENT_CREATOR_TERMS.contentHash} previouslySaved={isCurrentTermsReceipt(initialAcceptance)} validate={receipt=>!!receipt&&typeof receipt==='object'&&isCurrentTermsReceipt(receipt as CreatorTermsReceipt)} onAccepted={onAccepted} label={<>I agree to the AirBharath Workspace <Link href={creatorTermsHref()} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Creator Terms</Link> (opens in a new tab).</>}/>}
