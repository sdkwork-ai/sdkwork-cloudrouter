import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible role object. */
export interface OpenAiRole {
  /** Unix timestamp in seconds when the role was created. */
  created_at?: string;
  /** Human-readable role description. */
  description?: string;
  /** Role identifier. */
  id: string;
  /** Human-readable role name. */
  name: string;
  /** Object type, normally role. */
  object: 'role';
  /** Permission identifiers granted by the role. */
  permissions?: string[];
}
