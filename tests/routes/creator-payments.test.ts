import { expect,it } from 'vitest';
import { paymentFact,proceeds,dueBefore } from '@/lib/creator-payments/model';
it('deducts actual inclusive gateway fee once and allocates course tax from the frozen quote',()=>{
 expect(proceeds(11800,1800,0,236)).toEqual({refundTax:0,net:9764});
 expect(proceeds(11800,1800,5900,236)).toEqual({refundTax:900,net:4764});
 expect(proceeds(11800,1800,11800,236)).toEqual({refundTax:1800,net:-236});
});
it('preserves unknown fees and rejects ambiguous currency, unsafe money and fee tax',()=>{
 const p={id:'pay_synthetic',order_id:'order_synthetic',amount:11800,currency:'INR',status:'captured',amount_refunded:0};
 expect(paymentFact(p)).toMatchObject({fee:null,tax:null});
 expect(paymentFact({...p,fee:236,tax:36})).toMatchObject({fee:236,tax:36});
 for(const bad of [{amount:NaN},{amount:1.5},{amount:'11800'},{currency:'USD'},{status:'authorized'},{amount_refunded:11801},{fee:5,tax:6}])expect(()=>paymentFact({...p,...bad})).toThrow();
});
it('uses the previous calendar month cutoff in India',()=>{
 expect(dueBefore(new Date('2026-11-01T00:00:00+05:30')).toISOString()).toBe('2026-10-31T18:30:00.000Z');
 // The IST date has crossed a month boundary before UTC does.
 expect(dueBefore(new Date('2026-10-31T20:00:00Z')).toISOString()).toBe('2026-10-31T18:30:00.000Z');
});
