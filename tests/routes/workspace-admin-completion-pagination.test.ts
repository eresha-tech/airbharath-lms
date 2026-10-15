import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import {listParams} from '@/lib/workspace/admin/pagination';
import {WorkspaceInfluencers} from '@/components/workspace/WorkspaceInfluencers';
import {WorkspaceCoupons} from '@/components/workspace/WorkspaceCoupons';
const filters=listParams({q:'SYNTHETIC',status:'all',sort:'name',size:'50',page:'2'});
describe('Editor pagination preserves server URL state and resets filter pages',()=>{
 it('influencer GET controls and page links preserve search/status/sort/size without carrying old page into a filter',()=>{const html=renderToStaticMarkup(createElement(WorkspaceInfluencers,{rows:[],onChange:vi.fn(),filters,initialHasNext:true}));for(const name of ['q','status','sort','size'])expect(html).toContain(`name="${name}"`);expect(html).toContain('method="get"');expect(html).not.toContain('name="page"');expect(html).toContain('page=3');expect(html).toContain('size=50');expect(html).toContain('Page 2');});
 it('coupon controls expose 25/50, preserve next/previous URL filters, and keep separate LMS coupon navigation',()=>{const html=renderToStaticMarkup(createElement(WorkspaceCoupons,{initial:{coupons:[],page:2,hasNext:true},initialInfluencers:[],filters}));expect(html).toContain('method="get"');for(const name of ['q','status','sort','size'])expect(html).toContain(`name="${name}"`);expect(html).not.toContain('name="page"');expect(html).toContain('page=3');expect(html).toContain('page=1');expect(html).toContain('size=50');expect(html).toContain('LMS Course Coupons (separate)');});
});
