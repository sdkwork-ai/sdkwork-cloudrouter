import type { ProviderJsonValue } from './provider-json-value';

/** Alibaba DashScope speech synthesis response carrying the generated audio URL. */
export interface AlibabaSpeechResponse {
  /** DashScope business error code when the synthesis failed. */
  code?: string;
  /** DashScope business error message when the synthesis failed. */
  message?: string;
  /** Output envelope carrying audio.url (valid for 24 hours) and finish_reason. */
  output?: Record<string, ProviderJsonValue>;
  /** DashScope request identifier. */
  request_id?: string;
  /** DashScope usage block carrying the billed character count. */
  usage?: Record<string, ProviderJsonValue>;
}
