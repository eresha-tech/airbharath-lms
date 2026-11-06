import { expect,it } from 'vitest';
import { courseScope } from '@/lib/creator-payments/config';
it('binds account and mode independently of credential rotation',()=>{
 const env={RAZORPAY_KEY_ID:'rzp_test_SYNTHETIC1',RAZORPAY_KEY_SECRET:'synthetic-only',COURSE_RAZORPAY_ACCOUNT_ID:'acc_synthetic'};
 expect(courseScope(env)).toBe('test:acc_synthetic');
 expect(courseScope({...env,RAZORPAY_KEY_ID:'rzp_test_SYNTHETIC2'})).toBe('test:acc_synthetic');
 expect(courseScope({...env,COURSE_RAZORPAY_ACCOUNT_ID:undefined})).toBeNull();
 expect(courseScope({...env,NEXT_PUBLIC_RAZORPAY_KEY_ID:'rzp_test_DIFFERENT'})).toBeNull();
 expect(courseScope({...env,RAZORPAY_KEY_ID:'rzp_live_SYNTHETIC',DATABASE_ENV:'test'})).toBeNull();
 expect(courseScope({...env,RAZORPAY_KEY_ID:'rzp_live_SYNTHETIC',DATABASE_ENV:'production'})).toBe('live:acc_synthetic');
});
