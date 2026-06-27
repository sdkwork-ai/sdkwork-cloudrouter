import type { ProviderJsonValue } from './provider-json-value';

/** Batch request processing counters. */
export interface OpenAiBatchRequestCounts {
  /** Number of completed requests. */
  completed?: number;
  /** Number of failed requests. */
  failed?: number;
  /** Total number of requests in the batch. */
  total?: number;
}
