import {sponsorshipHttp} from '@/lib/workspace/sponsorship/http';
export const runtime='nodejs';
export const GET=(request:Request)=>sponsorshipHttp(request,true);
export const POST=(request:Request)=>sponsorshipHttp(request,true);
