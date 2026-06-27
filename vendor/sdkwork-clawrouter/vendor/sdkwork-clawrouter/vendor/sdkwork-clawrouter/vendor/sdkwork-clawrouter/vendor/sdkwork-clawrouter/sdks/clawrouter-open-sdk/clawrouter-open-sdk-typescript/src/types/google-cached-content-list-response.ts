import type { GoogleCachedContent } from './google-cached-content';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google cached content list response schema exposed by Claw Router vendor routing. */
export interface GoogleCachedContentListResponse {
  /** Cached content resources. */
  cachedContents?: GoogleCachedContent[];
  /** Pagination token for the next page. */
  nextPageToken?: string;
}
