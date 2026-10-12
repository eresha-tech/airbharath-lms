export type WorkspaceRuntime = 'production' | 'development' | 'test' | 'preview' | 'unclassified';
export function classifyWorkspaceRuntime(env?: Record<string, string | undefined>): WorkspaceRuntime;
export interface FinancialReadiness {
  runtime: WorkspaceRuntime;
  mode: 'test' | 'live' | 'unconfigured';
  keyType: 'test' | 'live' | 'invalid' | 'missing';
  accountConfigured: boolean;
  webhookConfigured: boolean;
  liveModeSafe: boolean;
  testModeSafe: boolean;
  checkoutReady: boolean;
  refundMutationReady: boolean;
  webhookReady: boolean;
  reconciliationReady: boolean;
  noticesReady: false;
  reasons: string[];
  noticeStatus: 'delivery_worker_not_provisioned';
}
export function workspaceFinancialReadiness(env?: Record<string, string | undefined>): FinancialReadiness;
