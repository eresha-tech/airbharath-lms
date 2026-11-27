import {sponsorshipHttp} from '@/lib/workspace/sponsorship/http';
export const runtime='nodejs';
export const GET=(request:Request)=>sponsorshipHttp(request);
export const POST=(request:Request)=>sponsorshipHttp(request);
