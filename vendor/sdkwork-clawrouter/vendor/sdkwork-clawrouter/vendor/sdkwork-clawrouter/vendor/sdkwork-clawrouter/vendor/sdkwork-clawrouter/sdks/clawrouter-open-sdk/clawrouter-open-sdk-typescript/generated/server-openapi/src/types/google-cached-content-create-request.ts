import type { GoogleContent } from './google-content';
import type { GoogleTool } from './google-tool';
import type { GoogleToolConfig } from './google-tool-config';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google cached content create request schema exposed by Claw Router vendor routing. */
export interface GoogleCachedContentCreateRequest {
  /** Content to cache. */
  contents?: GoogleContent[];
  /** Human-readable cached content display name. */
  displayName?: string;
  /** Absolute expiration time for the cache. */
  expireTime?: string;
  /** Model resource name for the cache. */
  model?: string;
  /** System instruction field on the google cached content create request, using the google content module. */
  systemInstruction?: GoogleContent;
  /** Tool config field on the google cached content create request, using the google tool config module. */
  toolConfig?: GoogleToolConfig;
  /** Tools associated with cached content. */
  tools?: GoogleTool[];
  /** Time-to-live duration for the cache. */
  ttl?: string;
}
