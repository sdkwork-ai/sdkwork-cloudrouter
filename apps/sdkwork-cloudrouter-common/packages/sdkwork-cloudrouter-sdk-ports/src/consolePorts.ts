import type {
  CloudRouterTransportPayload,
  ConsoleSessionSnapshot,
} from '@sdkwork/cloudrouter-contracts';

export interface CloudRouterConsoleQuery {
  readonly page?: number;
  readonly pageSize?: number;
}

export interface ConsoleUsageQuery extends CloudRouterConsoleQuery {
  readonly model?: string;
  readonly status?: string;
}

export interface ConsoleCatalogQuery extends CloudRouterConsoleQuery {
  readonly vendor?: string;
  readonly keyword?: string;
}

/** Wire modalities accepted by the generated `CreateApiKeyRequest`. */
export type ApiKeyModality = 'text' | 'image' | 'video' | 'audio' | 'music';

/**
 * Minimal mobile-facing create input. Everything the generated
 * `CreateApiKeyRequest` requires but a mobile form does not expose is optional
 * here and defaulted by the core adapter.
 */
export interface ConsoleApiKeyCreateInput {
  readonly name: string;
  readonly quota?: string;
  readonly isUnlimitedQuota?: boolean;
  readonly modalities?: readonly ApiKeyModality[];
  readonly ipLimit?: string;
  readonly expires?: string;
}

export interface ConsoleNotificationQuery extends CloudRouterConsoleQuery {
  readonly unreadOnly?: boolean;
}

/** Generated app SDK boundary for the console overview read model. */
export interface ConsoleOverviewPort {
  retrieveOverview(): Promise<CloudRouterTransportPayload>;
}

/** Generated app SDK boundary for the console usage read model. */
export interface ConsoleUsagePort {
  listUsageLogs(query: ConsoleUsageQuery): Promise<CloudRouterTransportPayload>;
}

/** Generated app SDK boundary for API key management. */
export interface ConsoleApiKeyPort {
  listApiKeys(query: CloudRouterConsoleQuery): Promise<CloudRouterTransportPayload>;
  createApiKey(input: ConsoleApiKeyCreateInput): Promise<CloudRouterTransportPayload>;
  revokeApiKey(apiKeyId: string): Promise<void>;
}

/** Generated app SDK boundary for the official model and pricing catalog. */
export interface ConsoleCatalogPort {
  listPricingRates(query: ConsoleCatalogQuery): Promise<CloudRouterTransportPayload>;
}

/** Generated app SDK boundary for the notification inbox. */
export interface ConsoleNotificationPort {
  listNotifications(query: ConsoleNotificationQuery): Promise<CloudRouterTransportPayload>;
}

/** Host-owned session persistence boundary (secure storage per platform). */
export interface ConsoleSessionPort {
  readSession(): ConsoleSessionSnapshot;
  saveSession(session: ConsoleSessionSnapshot): void;
  clearSession(): void;
}

export interface CloudRouterConsolePorts {
  readonly overview: ConsoleOverviewPort;
  readonly usage: ConsoleUsagePort;
  readonly apiKeys: ConsoleApiKeyPort;
  readonly catalog: ConsoleCatalogPort;
  readonly session: ConsoleSessionPort;
  readonly notifications?: ConsoleNotificationPort;
}
