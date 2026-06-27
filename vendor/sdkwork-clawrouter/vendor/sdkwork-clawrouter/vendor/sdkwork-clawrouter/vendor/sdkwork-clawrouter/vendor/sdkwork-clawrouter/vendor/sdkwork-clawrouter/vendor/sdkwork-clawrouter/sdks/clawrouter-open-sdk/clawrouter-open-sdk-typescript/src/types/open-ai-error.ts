import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai error schema exposed by Claw Router. */
export interface OpenAiError {
  /** Machine-readable error code. */
  code: string;
  /** Human-readable error message. */
  message: string;
  /** Request parameter related to the error when available. */
  param?: string | null;
  /** Gateway path that produced the error when available. */
  path?: string;
  /** OpenAI-compatible error type. */
  type: string;
}
