import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai response error schema exposed by Claw Router. */
export interface OpenAiResponseError {
  /** Response error code. */
  code?: string;
  /** Human-readable response error message. */
  message?: string;
  /** Parameter related to the response error. */
  param?: string;
  /** Response error type. */
  type?: string;
}
