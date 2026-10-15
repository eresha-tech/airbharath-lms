import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
import { AdminRefundActions } from '@/components/workspace/RefundActions';
it('exposes only confirmed explicit same-request recovery for an approved uncertain intent',()=>{
 const render=(decision:string,execution:string,recoveryAvailable:boolean)=>renderToStaticMarkup(React.createElement(AdminRefundActions,{orderId:'synthetic',decision,execution,recoveryAvailable}));
 const html=render('approved','uncertain',true);
 expect(html).toContain('Recover same refund request');expect(html).toContain('idempotency key');expect(html).toContain('disabled=""');
 for(const args of [['approved','uncertain',false],['approved','processing',true],['approved','completed',true],['requested','uncertain',true],['external','uncertain',true]] as const)expect(render(args[0],args[1],args[2])).not.toContain('Recover same refund request');
});
it('shows safe provider-rejection guidance without declaring completion or removing access',()=>{
 const html=renderToStaticMarkup(React.createElement(AdminRefundActions,{orderId:'synthetic',decision:'approved',execution:'uncertain',providerRequestRejected:true}));
 expect(html).toContain('Razorpay rejected a refund API request');expect(html).toContain('Completion is unconfirmed');expect(html).toContain('Paid access ends only after the full refund is verified');
});
