import type { GoogleContent } from './google-content';
import type { GoogleTool } from './google-tool';
import type { GoogleToolConfig } from './google-tool-config';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini cached-content creation request (`POST /v1beta/cachedContents`). */
export interface GoogleCachedContentCreateRequest {
  /** Content to cache. */
  contents?: GoogleContent[];
  /** Human-readable cached content display name. */
  displayName?: string;
  /** Absolute expiration time for the cache. */
  expireTime?: string;
  /** Model resource name for the cache, for example `models/gemini-2.5-flash`. */
  model: string;
  /** System instruction field on the google cached content create request, using the google content module. */
  systemInstruction?: GoogleContent;
  /** Tool config field on the google cached content create request, using the google tool config module. */
  toolConfig?: GoogleToolConfig;
  /** Tools associated with cached content. */
  tools?: GoogleTool[];
  /** Time-to-live duration for the cache. */
  ttl?: string;
}
