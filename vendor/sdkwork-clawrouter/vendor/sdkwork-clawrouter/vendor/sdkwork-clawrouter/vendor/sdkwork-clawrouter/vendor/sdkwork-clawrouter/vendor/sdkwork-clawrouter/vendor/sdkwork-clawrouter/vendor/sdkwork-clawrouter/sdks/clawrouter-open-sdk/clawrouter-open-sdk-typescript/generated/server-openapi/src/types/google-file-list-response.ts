import type { GoogleFile } from './google-file';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google file list response schema exposed by Claw Router vendor routing. */
export interface GoogleFileListResponse {
  /** Gemini files visible to the provider account. */
  files?: GoogleFile[];
  /** Pagination token for the next page. */
  nextPageToken?: string;
}
