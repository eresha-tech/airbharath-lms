import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { calculatePrice, type PlanCode } from '@/lib/workspace/membership/model';
import { financialHarness } from './workspace-payments-fixtures';

// Proposal values, not a second runtime catalog. The database remains authoritative.
const migration = readFileSync('drizzle/0026_workspace_membership_pricing_v2.sql', 'utf8');
const proposed = [...migration.matchAll(/\('([a-f0-9-]+)', '(quarterly|half_yearly|yearly)', (\d+), '([^']+)', (\d+), (\d+), 1800, 'INR', true, true\)/g)].map(m => ({ id: m[1], code: m[2] as PlanCode, version: Number(m[3]), displayName: m[4], durationMonths: Number(m[5]), basePricePaise: Number(m[6]) }));
const cases = [
  { code: 'quarterly', base: 499915, gst: 89985, total: 589900, fixedGst: 80985, fixed: 530900, percentageDiscount: 49992, percentageGst: 80986, percentage: 530909 },
  { code: 'half_yearly', base: 847373, gst: 152527, total: 999900, fixedGst: 143527, fixed: 940900, percentageDiscount: 84737, percentageGst: 137274, percentage: 899910 },
  { code: 'yearly', base: 1499915, gst: 269985, total: 1769900, fixedGst: 260985, fixed: 1710900, percentageDiscount: 149992, percentageGst: 242986, percentage: 1592909 },
] as const;
function successor(h: ReturnType<typeof financialHarness>) {
  h.catalog.forEach(plan => Object.assign(plan, proposed.find(p => p.code === plan.code)!));
}
describe('F.1 successor pricing proposal (not applied PostgreSQL verification)', () => {
  it('uses existing versioned rows without changing schema, financial history or guards', () => {
    expect(proposed.map(p => [p.code,p.version])).toEqual([['quarterly',5],['half_yearly',2],['yearly',2]]);
    const before = JSON.parse(readFileSync('drizzle/meta/0025_snapshot.json','utf8'));
    const after = JSON.parse(readFileSync('drizzle/meta/0026_snapshot.json','utf8'));
    expect(after.tables).toEqual(before.tables); expect(after.enums).toEqual(before.enums);
    expect(after.prevId).toBe(before.id);
    expect(migration).not.toMatch(/(?:UPDATE|INSERT INTO|DELETE FROM) workspace_(?:membership_orders|payment_attempts|refund_completions|memberships|coupon_redemptions)|ALTER TABLE|DISABLE TRIGGER|DROP|TRUNCATE/i);
  });
  it.each(cases)('$code GST-inclusive approved total', p => {
    expect(proposed.find(plan => plan.code === p.code)?.basePricePaise).toBe(p.base);
    expect(calculatePrice(p.base,1800)).toMatchObject({ discountPaise:0, taxableAmountPaise:p.base, gstAmountPaise:p.gst, totalPaise:p.total });
  });
  it.each(cases)('$code fixed ₹500 discount precedes GST', p => {
    expect(calculatePrice(p.base,1800,{discountType:'fixed',discountValue:50000})).toMatchObject({ discountPaise:50000, taxableAmountPaise:p.base-50000, gstAmountPaise:p.fixedGst, totalPaise:p.fixed });
  });
  it.each(cases)('$code 10% and GST independently round half-up in paise', p => {
    expect(calculatePrice(p.base,1800,{discountType:'percentage',discountValue:1000})).toMatchObject({ discountPaise:p.percentageDiscount, taxableAmountPaise:p.base-p.percentageDiscount, gstAmountPaise:p.percentageGst, totalPaise:p.percentage });
  });
  it('rejects a v1 quote after successor publication and retains accepted retry economics', async () => {
    const h=financialHarness(), old=await h.input(randomUUID(),false), accepted=await h.service.acceptOrder(old.userId,old.request);
    const stale=await h.input(randomUUID(),false);
    successor(h);
    await expect(h.service.acceptOrder(stale.userId,stale.request)).rejects.toMatchObject({code:'quote_changed'});
    const retry=await h.service.acceptOrder(old.userId,old.request);
    expect(retry.id).toBe(accepted.id);expect(retry.totalPaise).toBe(589882);expect(retry.planSnapshot.version).toBe(1);
  });
  it('reconciles an old pending provider order using its frozen amount after catalog publication', async () => {
    const h=financialHarness(),order=await h.ready(false), frozen=structuredClone(order);
    successor(h);h.captured(order);await h.service.reconcileOrder(order.userId,order.id);
    expect(order).toMatchObject({financialState:'captured',totalPaise:589882,basePricePaise:499900,gstAmountPaise:89982,planVersionId:frozen.planVersionId,planSnapshot:frozen.planSnapshot});
    expect(order.refundEligibleUntil!.getTime()-order.paidAt!.getTime()).toBe(259200000);
    expect(h.provider.createOrder).toHaveBeenCalledTimes(1);
  });
  it.each(cases)('$code successor order freezes the server quote and sends the identical fake-provider amount', async p => {
    const h=financialHarness(),{userId}=await h.input(randomUUID(),false);successor(h);
    const plan=h.catalog.find(plan=>plan.code===p.code)!;
    const identifiers={planCode:plan.code,planVersionId:plan.id};
    const {quote}=await h.store.transaction({userId},tx=>tx.readQuote(userId,identifiers,()=>h.now.value));
    const request={...identifiers,quoteHash:quote.quoteHash,requestKey:randomUUID()};
    const tampered={...request,totalPaise:1};
    await expect(h.service.acceptOrder(userId,tampered)).rejects.toMatchObject({code:'validation'});
    const order=await h.service.acceptOrder(userId,request);await h.service.ensureProviderOrder(userId,order.id);
    expect(order).toMatchObject({totalPaise:p.total,basePricePaise:p.base,gstAmountPaise:p.gst,planSnapshot:{version:plan.version,displayName:plan.displayName}});
    expect(h.provider.createOrder).toHaveBeenCalledWith({amountPaise:p.total,currency:'INR',receipt:order.providerReceipt});
    h.captured(order);await h.service.reconcileOrder(userId,order.id);
    expect(order.financialState).toBe('captured');expect(order.totalPaise).toBe(p.total);
  });
});
