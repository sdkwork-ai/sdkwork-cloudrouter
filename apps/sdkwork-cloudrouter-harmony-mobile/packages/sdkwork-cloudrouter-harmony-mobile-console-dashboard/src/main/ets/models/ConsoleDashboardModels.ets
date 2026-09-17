/**
 * View/screen models for the console-dashboard capability.
 *
 * API DTOs come from generated app SDK clients; this file owns view models,
 * screen models, and route params only. Shared normalization rules live in the
 * TypeScript read-model service (`@sdkwork/cloudrouter-service`) and are not
 * duplicated here.
 */
/** Normalized console overview read model (minor units for money). */
export interface ConsoleOverviewSnapshot {
  readonly totalRequests: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly errorCount: number;
  readonly errorRate: number;
  readonly costMinorUnits: number;
  readonly currency: 'CNY';
}

export interface ConsoleDashboardScreenModel {
  readonly overview: ConsoleOverviewSnapshot | null;
  readonly loading: boolean;
  readonly errorMessage?: string;
}
