'use client';
import {useRouter} from 'next/navigation';
import {CreatorTermsAcceptance} from './CreatorTermsAcceptance';
export function GrantTerms(){const router=useRouter();return <section className="rounded-xl border border-border p-5"><h2 className="font-semibold">Review Creator Terms</h2><p className="my-3 text-sm text-muted-foreground">Your complimentary access requires the current Creator Terms. No payment or purchase refund receipt is required.</p><CreatorTermsAcceptance onAccepted={accepted=>{if(accepted)router.refresh();}}/></section>;}
