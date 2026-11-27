import type {ReviewStatus} from '@/lib/workspace/review/model';
export function SubmitReview(_props:{id:string;version:number;resubmit?:boolean}){return <p className="text-sm text-muted-foreground">Legacy review history is retained. Creators now publish directly from Course Studio.</p>;}
export function AdminReviewActions(_props:{id:string;status:ReviewStatus}){return <p className="text-sm text-muted-foreground">Legacy review is read only. Use Creator course moderation for post-publication actions.</p>;}
