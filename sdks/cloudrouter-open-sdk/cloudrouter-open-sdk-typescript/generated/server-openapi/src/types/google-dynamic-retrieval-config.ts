import type { ProviderJsonValue } from './provider-json-value';

/** Dynamic retrieval configuration for Google Search grounding. */
export interface GoogleDynamicRetrievalConfig {
  /** Dynamic retrieval confidence threshold. */
  dynamicThreshold?: number;
  /** Dynamic retrieval mode. */
  mode?: string;
}
