/**
 * Transport-agnostic payload handed from a generated SDK call to the shared
 * Cloud Router services. Generated app SDK responses differ per language, so
 * platform cores forward the raw payload and the shared services normalize it.
 */
export interface CloudRouterTransportPayload {
  readonly [key: string]: unknown;
}

export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface ConsoleOverviewSnapshot {
  readonly totalRequests: number;
  readonly totalTokens: number;
  readonly costMinorUnits: number;
  readonly errorRate: number;
  readonly currency: string;
  readonly windowLabel: string | null;
}

export type ConsoleUsageStatus = 'succeeded' | 'failed' | 'processing' | 'unknown';

export interface ConsoleUsageRecord {
  readonly id: string;
  readonly model: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly costMinorUnits: number;
  readonly status: ConsoleUsageStatus;
  readonly occurredAt: string | null;
}

export type ConsoleApiKeyStatus = 'active' | 'disabled' | 'revoked' | 'unknown';

export interface ConsoleApiKeySummary {
  readonly id: string;
  readonly name: string;
  readonly maskedKey: string;
  readonly status: ConsoleApiKeyStatus;
  readonly createdAt: string | null;
  readonly lastUsedAt: string | null;
}

export interface ConsoleCatalogRateRow {
  readonly id: string;
  readonly vendor: string;
  readonly model: string;
  readonly inputPricePerMillionTokens: number | null;
  readonly outputPricePerMillionTokens: number | null;
  readonly currency: string;
  readonly unit: string;
}

export interface ConsoleNotificationItem {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly acknowledged: boolean;
  readonly createdAt: string | null;
}

export interface ConsoleSessionSnapshot {
  readonly authenticated: boolean;
  readonly accessToken: string | null;
  readonly authToken: string | null;
  readonly tenantId: string | null;
  readonly organizationId: string | null;
  readonly subject: string | null;
}
