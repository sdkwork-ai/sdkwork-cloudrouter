import type { ProviderJsonValue } from './provider-json-value';

/** Google URL context tool configuration. */
export interface GoogleUrlContextTool {
  /** Domains allowed for URL context retrieval. */
  allowedDomains?: string[];
}
