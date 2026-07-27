import type { AppApiKeyItem } from './app-api-key-item';

/** Update api key response schema exposed by Claw Router. */
export interface UpdateApiKeyResponse {
  /** Item field on update api key response. */
  item: AppApiKeyItem;
}
