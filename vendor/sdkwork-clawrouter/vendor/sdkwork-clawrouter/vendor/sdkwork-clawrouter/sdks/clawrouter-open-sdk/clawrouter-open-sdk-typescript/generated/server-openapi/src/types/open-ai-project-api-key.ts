import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible project API key object. */
export interface OpenAiProjectApiKey {
  /** Unix timestamp in seconds when the key was created. */
  created_at?: string;
  /** Project API key identifier. */
  id: string;
  /** Unix timestamp in seconds when the key was last used. */
  last_used_at?: string;
  /** Human-readable API key name. */
  name: string;
  /** Object type, normally project.api_key. */
  object: 'project.api_key';
  /** Owner user or service account. */
  owner?: ProviderJsonValue;
  /** Redacted API key value. */
  redacted_value?: string;
}
