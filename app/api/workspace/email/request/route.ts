import { getWorkspaceUser } from '@/lib/workspace/eligibility/service';
import { eligibilitySameOrigin } from '@/lib/workspace/eligibility/request';
import { readJson,privateJson } from '@/lib/workspace/http';
import { emailVerificationRuntime } from '@/lib/workspace/email/runtime';
import { emailClientIp } from '@/lib/workspace/email/request';
import { EmailVerificationError } from '@/lib/workspace/email/model';
import { emailFailure } from '@/lib/workspace/email/http';
export async function POST(request:Request){if(!eligibilitySameOrigin(request))return privateJson({error:'Request origin is not allowed.'},403);try{const user=await getWorkspaceUser();if(!user)throw new EmailVerificationError('authentication');let input:unknown;try{input=await readJson(request,1024)}catch{throw new EmailVerificationError('validation')}return privateJson({status:await emailVerificationRuntime().request(user.id,input,emailClientIp(request))})}catch(error){return emailFailure(error)}}
