import { notFound } from 'next/navigation';
import { creatorAnalytics } from './repository';
import { analyticsFilters, AnalyticsError } from './model';
export async function readAnalyticsPage(actor:string,creator:string|null,params:Record<string,string|string[]|undefined>) {
 try {const f=analyticsFilters(params);return {data:await creatorAnalytics().read(actor,creator,f),error:null};}
 catch(e){if(e instanceof AnalyticsError){if(e.status===404||e.status===403)notFound();return {data:null,error:e.message};}throw e;}
}
