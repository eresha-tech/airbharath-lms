// Shared reporting definitions. These do not alter accounting or LMS state.
export const ANALYTICS_ZONE = 'Asia/Kolkata';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ranges = [['7','Last 7 days'],['30','Last 30 days'],['90','Last 90 days'],['month','This month'],['custom','Custom dates']] as const;
export const views = [['overview','Overview'],['sales','Sales'],['students','Students & engagement'],['courses','Course performance']] as const;
export class AnalyticsError extends Error { constructor(public status: number, message: string) { super(message); } }
export type AnalyticsFilters = { range: string; from: string; to: string; start: string; end: string; previous: string; days: number; course: string; creator: string; view: string; page: number };
const day = 86400000;
export function indiaDate(now = new Date()) { return new Date(now.getTime()+19800000).toISOString().slice(0,10); }
function date(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value; }
const shift = (value: string, days: number) => new Date(Date.parse(value)+days*day).toISOString().slice(0,10);
export function analyticsFilters(input: Record<string,string|string[]|undefined>, now = new Date()): AnalyticsFilters {
 const get=(key:string)=>typeof input[key]==='string'?input[key] as string:'';
 const today=indiaDate(now),range=get('range')||'30';
 if(!ranges.some(([key])=>key===range))throw new AnalyticsError(400,'Choose a reporting range.');
 const from=range==='custom'?get('from'):range==='month'?today.slice(0,7)+'-01':shift(today,1-Number(range)),to=range==='custom'?get('to'):today;
 if(!date(from)||!date(to)||from>to||to>today)throw new AnalyticsError(400,'Choose valid dates in order, ending today or earlier.');
 const days=(Date.parse(to)-Date.parse(from))/day+1;
 if(days>366)throw new AnalyticsError(400,'Choose a date range of 366 days or fewer.');
 const course=get('course'),creator=get('creator');
 if((course&&!UUID.test(course))||(creator&&!UUID.test(creator)))throw new AnalyticsError(404,'Analytics selection not found.');
 const view=get('tab')||'overview';if(!views.some(([key])=>key===view))throw new AnalyticsError(400,'Choose an analytics view.');
 const page=get('page')||'1';if(!/^[1-9]\d{0,3}$/.test(page))throw new AnalyticsError(400,'Choose a valid result page.');
 return {range,from,to,start:from+'T00:00:00+05:30',end:shift(to,1)+'T00:00:00+05:30',previous:shift(from,-days)+'T00:00:00+05:30',days,course,creator,view,page:Number(page)};
}
export function analyticsQuery(f: AnalyticsFilters, changes: Partial<AnalyticsFilters> = {}) {
 const v={...f,...changes};return new URLSearchParams({range:v.range,from:v.from,to:v.to,course:v.course,creator:v.creator,tab:v.view,page:String(v.page)}).toString();
}
export function completionRate(completed:number,eligible:number) {return eligible>0?Math.round(completed/eligible*1000)/10:null;}
export function salesComparison(current:number,previous:number,firstSale:string|null,filters:AnalyticsFilters) {
 if(!firstSale||Date.parse(firstSale)>Date.parse(filters.previous)||current===0||previous===0)return null;
 return {difference:current-previous,previous};
}
export const metricDefinitions = [
 ['Verified sales','One purchase with an immutable sale-ledger entry in the configured merchant/mode. Captured, later-refunded purchases remain sales; refunds are separate adjustments. Pending/uncertain orders are excluded. Sales dates use first recorded capture evidence.'],
 ['Collected revenue','Gross sale-ledger amounts recorded during the reporting period, before course tax and later adjustments. Discounts come from the frozen purchase quote, not today’s price.'],
 ['Net eligible revenue','Recorded gross minus recorded course tax, including signed refund, dispute and correction entries in the selected period; before gateway fees. This is not payout availability.'],
 ['Creator earnings','Sum of immutable net ledger entries recorded in the period, including evidenced gateway fees and adjustments. Missing fee evidence makes the result provisional. AirBharath sales commission is 0%.'],
 ['Enrolled learners','Distinct student accounts with direct or bundle enrollment, including expired/revoked access; a learner in two courses counts once overall. Per-course enrollment counts can overlap. New enrollments use the earliest enrollment into each course under the current bundle membership; historical bundle composition is not stored.'],
 ['Access and enrollment source','Current access requires active, unexpired direct or bundle enrollment and an unsuspended course/bundle. A matching paid order is evidence of paid origin, not current paid access. Other origins are unknown; the LMS does not reliably record complimentary origin.'],
 ['Started / progressing','Started means any saved non-preview lesson progress, including retained retired lessons. Progressing means started but not complete against the current curriculum. Enrollment alone is not engagement. No watch time or attention is inferred.'],
 ['Active learners','Distinct learners with current access and a saved lesson-progress update in the selected period. Only the latest update per lesson is stored; this is not a historical activity log or daily active-user series.'],
 ['Completion','Completed enrollment means all current non-retired, non-preview lessons are marked complete. Unreleased lessons remain required. Rate = completed course enrollments / enrollments with a nonempty current curriculum. Saved retired-lesson progress is retained but excluded from the current denominator. Revisions can change the rate.'],
 ['Ratings','Only currently published shared LMS reviews. The period count uses review creation dates; edits/moderation are not new reviews. The all-time rating is weighted across published reviews, not an average of course averages.'],
 ['Time and comparisons','Sales/ledger events, new enrollments and recent saved activity use inclusive India calendar dates. Progress/access/publication totals are current snapshots. Payouts use a separate monthly settlement policy. Comparisons need sales in both periods and evidence predating the previous period; an ongoing day is not a complete reporting day.'],
] as const;
export function courseStatus(status:string) {return ({live:'Published',draft:'Draft',building:'Building',unpublished:'Unpublished',suspended:'Suspended',historical:'Historical sales only'} as Record<string,string>)[status]??'Not published';}
