import{it,expect,vi}from'vitest';
import{financialConfiguration}from'@/lib/workspace/payments/configuration';
import{createRazorpayAdapter}from'@/lib/workspace/payments/provider';
const env={NODE_ENV:'production',DATABASE_ENV:'production',WORKSPACE_DEPLOYMENT_PROVIDER:'self-hosted',WORKSPACE_DEPLOYMENT_ENV:'production',WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED:'true',WORKSPACE_PRODUCTION_ACCOUNT_ID:'acc_SYNTHETICPROD',WORKSPACE_RAZORPAY_ACCOUNT_ID:'acc_SYNTHETICPROD',WORKSPACE_RAZORPAY_MODE:'live',WORKSPACE_RAZORPAY_KEY_ID:'rzp_live_SYNTHETICPROD',WORKSPACE_RAZORPAY_KEY_SECRET:'synthetic-api-secret-only',WORKSPACE_RAZORPAY_WEBHOOK_SECRET:'synthetic-webhook-only-distinct',WORKSPACE_RAZORPAY_LIVE_AUTHORIZED:'true',WORKSPACE_PAYMENT_ENABLED:'true'};
it('incoherent self-hosted classification fails before provider transport construction can perform work',()=>{
 try{for(const[k,v]of Object.entries(env))vi.stubEnv(k,v);for(const patch of[{DATABASE_ENV:'staging'},{WORKSPACE_PRODUCTION_ACCOUNT_ID:'acc_OTHERACCOUNT'},{WORKSPACE_RAZORPAY_KEY_ID:'rzp_test_SYNTHETICPROD'},{WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED:'false'}]){const http=vi.fn<typeof fetch>();expect(financialConfiguration('checkout',{...env,...patch})).toBeNull();expect(()=>createRazorpayAdapter({...env,...patch},http)).toThrow();expect(http).not.toHaveBeenCalled();}}
 finally{vi.unstubAllEnvs();}
});
it('valid self-hosted readiness retains independent authorization and operation kill switches',()=>{
 try{for(const[k,v]of Object.entries(env))vi.stubEnv(k,v);expect(financialConfiguration('checkout',env)?.mode).toBe('live');expect(financialConfiguration('checkout',{...env,WORKSPACE_PAYMENT_ENABLED:'false'})).toBeNull();expect(financialConfiguration('checkout',{...env,WORKSPACE_RAZORPAY_LIVE_AUTHORIZED:'false'})).toBeNull();}finally{vi.unstubAllEnvs();}
});
