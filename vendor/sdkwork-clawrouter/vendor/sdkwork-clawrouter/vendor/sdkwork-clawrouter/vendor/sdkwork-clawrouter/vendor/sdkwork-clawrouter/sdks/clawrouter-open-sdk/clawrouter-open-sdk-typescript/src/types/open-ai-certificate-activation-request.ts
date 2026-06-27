import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to activate or deactivate certificates. */
export interface OpenAiCertificateActivationRequest {
  /** Certificate identifiers to activate or deactivate. */
  certificate_ids: string[];
}
