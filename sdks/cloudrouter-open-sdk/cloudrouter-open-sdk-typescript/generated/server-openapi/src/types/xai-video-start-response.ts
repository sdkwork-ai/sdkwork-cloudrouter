import type { ProviderJsonValue } from './provider-json-value';

/** xAI deferred video start acknowledgement (StartDeferredResponse). */
export interface XaiVideoStartResponse {
  /** Unique request ID to poll for the result. */
  request_id: string;
}
