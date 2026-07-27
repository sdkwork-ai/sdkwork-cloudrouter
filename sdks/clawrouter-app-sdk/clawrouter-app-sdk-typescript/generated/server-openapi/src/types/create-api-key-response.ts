import type { AppApiKeyItem } from './app-api-key-item';

/** Create api key response schema exposed by Claw Router. */
export interface CreateApiKeyResponse {
  /** Item field on create api key response. */
  item: AppApiKeyItem;
  /** Full raw API key secret returned by create responses. Authenticated owner management list and update responses also expose this value as item.copyableKey for console copy actions. */
  rawKey: string;
}
