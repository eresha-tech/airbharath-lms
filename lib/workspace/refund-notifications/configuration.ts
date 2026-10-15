import 'server-only';
import { classifyWorkspaceRuntime } from '../payments/classification';
import { noticeDeliveryReadiness, noticePublicOrigin } from './configuration-core.mjs';
export type NoticeConfiguration = { apiKey: string; senderEmail: string; senderName: string; origin: string; providerScope: string };
export function noticeConfiguration(env: Record<string, string | undefined> = process.env): NoticeConfiguration | null {
  const runtime = classifyWorkspaceRuntime(env);
  if (!noticeDeliveryReadiness(env, runtime).noticeDeliveryAuthorized) return null;
  return { apiKey: env.MAILERCLOUD_API_KEY!, senderEmail: env.MAILERCLOUD_SENDER_EMAIL!, senderName: env.MAILERCLOUD_SENDER_NAME || 'AirBharath Workspace', origin: noticePublicOrigin(env.NEXT_PUBLIC_BASE_URL, runtime)!, providerScope: env.WORKSPACE_NOTICE_PROVIDER_SCOPE! };
}
