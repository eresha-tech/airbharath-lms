export function validNoticeEmail(value: unknown): value is string;
export function noticePublicOrigin(value: string | undefined, runtime: string): string | null;
export interface NoticeReadiness {
  noticeImplementationPresent: true;
  noticeConfigurationReady: boolean;
  noticeDeliveryAuthorized: boolean;
  noticeWorkerScheduled: false;
  noticeActualAcceptanceVerified: false;
  noticeRecipientVerificationAvailable: true;
  noticesReady: false;
  noticeStatus: 'operational_verification_pending';
  noticeReasons: string[];
}
export function noticeDeliveryReadiness(env: Record<string, string | undefined>, runtime: string): NoticeReadiness;
