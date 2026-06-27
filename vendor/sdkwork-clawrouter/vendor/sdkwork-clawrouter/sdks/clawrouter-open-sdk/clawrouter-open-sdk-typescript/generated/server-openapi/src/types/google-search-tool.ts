import type { GoogleDynamicRetrievalConfig } from './google-dynamic-retrieval-config';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Search grounding tool configuration. */
export interface GoogleSearchTool {
  /** Dynamic retrieval config field on the google search tool, using the google dynamic retrieval config module. */
  dynamicRetrievalConfig?: GoogleDynamicRetrievalConfig;
}
