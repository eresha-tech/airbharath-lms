import { getWorkspaceUser } from '@/lib/workspace/eligibility/service';
import { postgresEmailStore } from '@/lib/workspace/email/repository';
import { privateJson } from '@/lib/workspace/http';
import { emailFailure } from '@/lib/workspace/email/http';
import { EmailVerificationError } from '@/lib/workspace/email/model';
export async function GET(){try{const user=await getWorkspaceUser();if(!user)throw new EmailVerificationError('authentication');return privateJson({status:await postgresEmailStore.status(user.id)})}catch(error){return emailFailure(error)}}
