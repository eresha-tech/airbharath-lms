import { describe,expect,it } from 'vitest';
import { learnerEligible,requiredLessons,reviewInput } from '@/lib/reviews/model';
import { bayesianRating,catalogParams,rankingScore,rankingConfig } from '@/lib/discovery/model';
import { priceEvidence,capturedPayment } from '@/lib/commerce/model';
describe('verified learner review policy',()=>{
 const facts={role:'student',verified:true,self:false,active:true,ageHours:24,total:10,completed:2};
 it('requires actual learning and mature enrollment',()=>{expect(learnerEligible(facts)).toBe(true);});
 it.each([{role:'admin'},{verified:false},{self:true},{active:false},{ageHours:23.99},{total:0},{completed:1}])('rejects ineligible evidence %j',bad=>{expect(learnerEligible({...facts,...bad})).toBe(false);});
 it('handles short courses and large curricula fairly',()=>{expect([0,1,2,5,10,11,100].map(requiredLessons)).toEqual([0,1,2,2,2,3,20]);});
 const valid={rating:4,content:'Clear practical learning explanations.',showName:false,version:0};
 it('accepts private feedback with a valid version',()=>{expect(reviewInput(valid)).toEqual(valid);});
 it.each([{rating:0},{rating:6},{rating:2.5},{content:'short'},{content:'Check this https://spam.invalid please'},{showName:'true'},{version:-1},{userId:'forged'}])('rejects malformed or spam fields %j',bad=>{expect(()=>reviewInput({...valid,...bad})).toThrow();});
});
describe('organic discovery scoring',()=>{
 const empty={ratingSum:0,reviewCount:0,learners:0,engaged:0,completed:0,quality:1,ageDays:0};
 it('gives a new course a nonzero Bayesian prior and exposure',()=>{expect(bayesianRating(0,0)).toBe(4);expect(rankingScore(empty)).toBeGreaterThan(.3);});
 it('does not let one five star review outrank sustained excellent feedback',()=>{expect(bayesianRating(5,1)).toBeLessThan(bayesianRating(450,100));});
 it('bounds popularity and rewards relevant results',()=>{expect(rankingScore({...empty,learners:1e9})).toBeLessThan(1);expect(rankingScore({...empty,relevance:1})).toBeGreaterThan(rankingScore(empty));});
 it('uses normalized versioned weights',()=>{expect(Object.values(rankingConfig.weights).reduce((a,b)=>a+b,0)).toBeCloseTo(1);expect(rankingConfig.version).toContain('v1');});
 it('normalizes hostile or malformed query parameters',()=>{expect(catalogParams({q:['a'],page:'-10',sort:'sql',difficulty:'unknown'})).toEqual({q:'',page:1,sort:'relevance',category:'',difficulty:''});expect(catalogParams({page:'999999'}).page).toBe(1000);});
});
describe('purchase evidence and captured-payment binding',()=>{
 const course={title:'Synthetic course',price:'1499.00',accessDays:30,instructorId:'creator',workspaceProjectId:'project'};
 it('retains independent price attribution, discount and integer tax evidence',()=>{const e=priceEvidence(course,'approved-price',{id:'coupon',code:'SYNTHETIC',discountType:'percentage',discountValue:'10'});expect(e.totalPaise).toBe(134900);expect(e.discountPaise).toBe(15000);expect(e.taxablePaise+e.taxPaise).toBe(e.totalPaise);expect(e.priceId).toBe('approved-price');expect(e.creatorId).toBe('creator');});
 const order={razorpayOrderId:'order_test',amount:'1499.00'};const payment={id:'pay_test',order_id:'order_test',amount:149900,currency:'INR',status:'captured'};
 it('accepts only exact captured payment evidence',()=>{expect(capturedPayment(payment,order,'pay_test')).toBe(true);});
 it.each([{status:'authorized'},{status:'failed'},{amount:1},{currency:'USD'},{order_id:'order_other'},{id:'pay_other'},{amount_refunded:1}])('rejects mismatched or uncertain evidence %j',bad=>{expect(capturedPayment({...payment,...bad},order,'pay_test')).toBe(false);});
});
