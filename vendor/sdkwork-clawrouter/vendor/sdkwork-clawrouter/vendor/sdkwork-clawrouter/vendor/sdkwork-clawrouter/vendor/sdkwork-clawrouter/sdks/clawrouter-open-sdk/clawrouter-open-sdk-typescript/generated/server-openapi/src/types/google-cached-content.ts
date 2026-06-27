import type { GoogleCachedContentUsageMetadata } from './google-cached-content-usage-metadata';
import type { GoogleContent } from './google-content';
import type { GoogleTool } from './google-tool';
import type { GoogleToolConfig } from './google-tool-config';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google cached content schema exposed by Claw Router vendor routing. */
export interface GoogleCachedContent {
  /** Cached contents. */
  contents?: GoogleContent[];
  /** Creation timestamp. */
  createTime?: string;
  /** Human-readable cached content display name. */
  displayName?: string;
  /** Expiration timestamp. */
  expireTime?: string;
  /** Model resource name associated with the cache. */
  model?: string;
  /** Cached content resource name. */
  name?: string;
  /** System instruction field on the google cached content, using the google content module. */
  systemInstruction?: GoogleContent;
  /** Tool config field on the google cached content, using the google tool config module. */
  toolConfig?: GoogleToolConfig;
  /** Cached tool definitions. */
  tools?: GoogleTool[];
  /** Update timestamp. */
  updateTime?: string;
  /** Usage metadata field on the google cached content, using the google cached content usage metadata module. */
  usageMetadata?: GoogleCachedContentUsageMetadata;
}
