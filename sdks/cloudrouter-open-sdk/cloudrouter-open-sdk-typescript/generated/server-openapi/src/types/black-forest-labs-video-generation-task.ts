import type { ProviderJsonValue } from './provider-json-value';

/** Black Forest Labs asynchronous FLUX video generation record; poll GET /black_forest_labs/v1/get_result until status is Ready. */
export interface BlackForestLabsVideoGenerationTask {
  /** Provider diagnostics, including moderation reasons or error text. */
  details?: Record<string, ProviderJsonValue>;
  /** Generation identifier used for polling. */
  id?: string;
  /** Provider polling URL for the generation. */
  polling_url?: string;
  /** Completion ratio between 0 and 1. */
  progress?: number;
  /** Generation output envelope carrying the generated video sample. */
  result?: Record<string, ProviderJsonValue>;
  /** Task status, for example Pending, Ready, or Error. */
  status?: string;
}
