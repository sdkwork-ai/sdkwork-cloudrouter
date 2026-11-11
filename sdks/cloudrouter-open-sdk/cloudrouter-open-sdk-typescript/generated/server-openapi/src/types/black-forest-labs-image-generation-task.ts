import type { ProviderJsonValue } from './provider-json-value';

/** Black Forest Labs asynchronous FLUX generation record. */
export interface BlackForestLabsImageGenerationTask {
  /** Provider diagnostics, including moderation reasons or error text. */
  details?: Record<string, ProviderJsonValue>;
  /** Generation identifier used for polling. */
  id?: string;
  /** Provider polling URL for the generation. */
  polling_url?: string;
  /** Completion ratio between 0 and 1. */
  progress?: number;
  /** Generation output envelope carrying the generated sample. */
  result?: Record<string, ProviderJsonValue>;
  /** Task status, for example Pending, Ready, or Error. */
  status?: string;
}
