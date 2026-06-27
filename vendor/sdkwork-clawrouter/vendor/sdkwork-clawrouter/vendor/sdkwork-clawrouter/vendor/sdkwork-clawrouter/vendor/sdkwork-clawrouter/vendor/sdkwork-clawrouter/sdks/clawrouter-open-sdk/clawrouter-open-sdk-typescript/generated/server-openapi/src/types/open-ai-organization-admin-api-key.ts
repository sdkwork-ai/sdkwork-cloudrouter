import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible organization admin API key object. */
export interface OpenAiOrganizationAdminApiKey {
  /** Unix timestamp in seconds when the key was created. */
  created_at?: string;
  /** Admin API key identifier. */
  id: string;
  /** Unix timestamp in seconds when the key was last used. */
  last_used_at?: string;
  /** Human-readable API key name. */
  name: string;
  /** Object type, normally organization.admin_api_key. */
  object: 'organization.admin_api_key';
  /** Owner user or service account. */
  owner?: ProviderJsonValue;
  /** Redacted API key value. */
  redacted_value?: string;
  /** Full API key value returned only at creation time. */
  value?: string;
}
