import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {PayoutDetail,PayoutList,BalanceCards,FilterForm} from '@/components/workspace/finance/Shared';
import {financeFilters} from '@/lib/creator-payments/presentation';
import type {Payout} from '@/lib/creator-payments/reporting';
const payout={
 id:'00000000-0000-4000-8000-000000000001',creatorId:'00000000-0000-4000-8000-000000000002',name:'Synthetic Creator',masked:'Account ••••1234 · TEST0000001',amount:1000,state:'uncertain',provider:'razorpayx',providerId:'pout_SYNTHETICUX',providerStatus:'queued',executionStage:'tracking',authorizedBy:'00000000-0000-4000-8000-000000000003',submitAttempts:1,providerFees:null,providerTax:null,lastError:null,reason:'low_balance',reconciledAt:'2026-11-06T10:00:00Z',reversedAt:null,periodEnd:'2026-10-31T18:30:00Z',createdAt:'2026-11-06T09:00:00Z',updatedAt:'2026-11-06T10:00:00Z',bankReference:null,approvedBy:'00000000-0000-4000-8000-000000000004',initiatedBy:'00000000-0000-4000-8000-000000000003',payeeDecision:'verify_payee',initiatedAt:'2026-11-06T09:30:00Z',confirmedAt:null,
} satisfies Payout;
it('keeps provider operations and internal IDs out of ordinary Creator payment details',()=>{
 const html=renderToStaticMarkup(createElement(PayoutDetail,{p:payout}));
 expect(html).toContain('Payment delayed');expect(html).toContain('AirBharath’s side');expect(html).toContain('do not need to change your bank account');expect(html).toContain('0% sales commission');
 for(const term of ['RazorpayX','funding','reconciliation','independent','pout_SYNTHETICUX','Submission attempt'])expect(html).not.toContain(term);
 expect(html).not.toContain('Paid confirmation');
});
it('retains exact provider status, errors and unknown fee evidence in collapsed Admin details',()=>{
 const html=renderToStaticMarkup(createElement(PayoutDetail,{p:{...payout,lastError:'provider_permission_denied'},admin:true}));
 expect(html).toContain('<details');expect(html).not.toContain('<details open');expect(html).toContain('pout_SYNTHETICUX');expect(html).toContain('queued');expect(html).toContain('provider_permission_denied');expect(html).toContain('Not yet known');expect(html).not.toContain('₹0.00');
});
it('describes a returned payment without presenting its earlier confirmation as current Paid status',()=>{
 const html=renderToStaticMarkup(createElement(PayoutDetail,{p:{...payout,state:'failed',providerStatus:'reversed',confirmedAt:payout.updatedAt,reversedAt:payout.updatedAt}}));
 expect(html).toContain('Payment returned');expect(html).toContain('Earlier paid confirmation');expect(html).toContain('no longer counted in Paid to date');expect(html).toContain('Check payout account');
});
it('uses the same truthful Creator status in history and details and gives empty Admin queues a queue-specific message',()=>{
 const html=renderToStaticMarkup(createElement(PayoutList,{rows:[payout]}));expect(html).toContain('Payment delayed');expect(html).not.toContain('Queued');
 expect(renderToStaticMarkup(createElement(PayoutList,{rows:[],admin:true}))).toContain('Nothing in this queue');
 const filter=renderToStaticMarkup(createElement(FilterForm,{f:financeFilters({status:'pending'}),payouts:true}));
 expect(filter).toContain('aria-label="Status"');expect(filter).toContain('Payments not yet paid');
});
it('separates held and paid balances and exposes a shortfall without relabeling it as available earnings',()=>{
 const html=renderToStaticMarkup(createElement(BalanceCards,{s:{net:900,available:0,pending:0,reserved:500,paid:1000,blocked:0,fresh:true,current:0}}));
 expect(html).toContain('Payments in progress');expect(html).toContain('Paid to date');expect(html).toContain('₹5.00');expect(html).toContain('₹10.00');expect(html).toContain('Adjustments exceed your unpaid earnings by');expect(html).toContain('₹6.00');
});
