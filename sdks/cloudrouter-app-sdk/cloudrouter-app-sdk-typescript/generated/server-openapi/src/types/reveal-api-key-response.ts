import type { AppApiKeyItem } from './app-api-key-item';

/** Explicitly revealed API key secret; returned only by the audited reveal action. */
export interface RevealApiKeyResponse {
  /** Item field on reveal api key response. */
  item: AppApiKeyItem;
  /** Full raw API key secret, revealed only by this explicit audited action. */
  rawKey: string;
}
