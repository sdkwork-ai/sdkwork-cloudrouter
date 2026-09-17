/**
 * View/screen models for the console-api-keys capability.
 *
 * API DTOs come from generated app SDK clients; this file owns view models,
 * screen models, and route params only. Shared normalization rules live in the
 * TypeScript read-model service (`@sdkwork/cloudrouter-service`) and are not
 * duplicated here.
 */
/** Normalized API-key row. Plaintext keys never enter this model. */
export interface ConsoleApiKeyRow {
  readonly id: string;
  readonly name: string;
  readonly maskedKey: string;
  readonly status: 'active' | 'disabled';
}

export interface ConsoleApiKeysScreenModel {
  readonly rows: ConsoleApiKeyRow[];
  readonly createdSecret: string | null;
  readonly loading: boolean;
  readonly errorMessage?: string;
}
