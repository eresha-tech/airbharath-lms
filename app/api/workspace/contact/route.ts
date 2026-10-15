import { getSession, setSessionCookie } from '@/lib/auth';
import { getWorkspaceUser } from '@/lib/workspace/eligibility/service';
import { eligibilitySameOrigin } from '@/lib/workspace/eligibility/request';
import { readJson, privateJson } from '@/lib/workspace/http';
import { saveContactEmail } from '@/lib/workspace/email/contact';
import { EmailVerificationError } from '@/lib/workspace/email/model';

export async function POST(request: Request) {
  if (!eligibilitySameOrigin(request)) return privateJson({ error: 'Request origin is not allowed.' }, 403);
  try {
    const session = await getSession(), user = await getWorkspaceUser();
    if (!session || !user || session.id !== user.id) throw new EmailVerificationError('authentication');
    let input: unknown;
    try { input = await readJson(request, 1024); } catch { throw new EmailVerificationError('validation'); }
    const email = await saveContactEmail(user.id, input);
    await setSessionCookie({ ...session, role: user.role, fullName: user.fullName, email });
    return privateJson({ email });
  } catch (error) {
    const code = error instanceof EmailVerificationError ? error.code : 'unavailable';
    return privateJson({ error: code === 'authentication' ? 'Please sign in again.' : code === 'validation' ? 'Enter a valid contact email address.' : 'We could not save your contact email. Please try again.' }, code === 'authentication' ? 401 : code === 'validation' ? 400 : 503);
  }
}
