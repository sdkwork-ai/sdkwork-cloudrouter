import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible certificate object. */
export interface OpenAiCertificate {
  /** Whether the certificate is active. */
  active?: boolean;
  /** Certificate content or PEM when returned. */
  content?: string;
  /** Unix timestamp in seconds when the certificate was created. */
  created_at?: string;
  /** Unix timestamp in seconds when the certificate expires. */
  expires_at?: string;
  /** Certificate identifier. */
  id: string;
  /** Human-readable certificate name. */
  name?: string;
  /** Object type, normally certificate. */
  object: 'certificate';
}
