import type { AppApiKeyItem } from './app-api-key-item';

/** Create api key response schema exposed by Claw Router. */
export interface CreateApiKeyResponse {
  /** Item field on create api key response. */
  item: AppApiKeyItem;
  /** Full raw API key secret returned exactly once by the create operation. */
  rawKey: string;
}
