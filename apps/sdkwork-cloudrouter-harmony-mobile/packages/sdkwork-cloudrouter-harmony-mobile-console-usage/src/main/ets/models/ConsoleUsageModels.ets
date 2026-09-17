/**
 * View/screen models for the console-usage capability.
 *
 * API DTOs come from generated app SDK clients; this file owns view models,
 * screen models, and route params only. Shared normalization rules live in the
 * TypeScript read-model service (`@sdkwork/cloudrouter-service`) and are not
 * duplicated here.
 */
/** Normalized console usage row. */
export interface ConsoleUsageRecord {
  readonly id: string;
  readonly model: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly costMinorUnits: number;
  readonly status: 'succeeded' | 'failed';
  readonly createdAt: string;
}

/** Normalized console usage page. */
export interface ConsoleUsagePage {
  readonly items: ConsoleUsageRecord[];
  readonly total: number;
  readonly page: number;
  readonly size: number;
}

export interface ConsoleUsageScreenModel {
  readonly items: ConsoleUsageRecord[];
  readonly total: number;
  readonly loading: boolean;
  readonly hasMore: boolean;
  readonly errorMessage?: string;
}
