import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic message batch request counts schema exposed by Claw Router vendor routing. */
export interface AnthropicMessageBatchRequestCounts {
  /** Requests that were canceled. */
  canceled?: number;
  /** Requests that errored. */
  errored?: number;
  /** Requests that expired. */
  expired?: number;
  /** Requests still processing. */
  processing?: number;
  /** Requests that succeeded. */
  succeeded?: number;
}
