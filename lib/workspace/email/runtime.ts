import 'server-only';
import { postgresEmailStore } from './repository';
import { createEmailVerificationService } from './service';
import { createVerificationMailercloudAdapter } from './provider';
import { EmailVerificationError } from './model';
export function emailVerificationRuntime(){try{return createEmailVerificationService(postgresEmailStore,createVerificationMailercloudAdapter(),process.env.WORKSPACE_EMAIL_OTP_SECRET||'')}catch{throw new EmailVerificationError('unavailable')}}
