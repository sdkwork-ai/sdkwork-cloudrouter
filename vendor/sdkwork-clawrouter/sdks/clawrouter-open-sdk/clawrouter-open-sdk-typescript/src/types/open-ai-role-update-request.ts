import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update a role. */
export interface OpenAiRoleUpdateRequest {
  /** Human-readable role description. */
  description?: string;
  /** Human-readable role name. */
  name?: string;
  /** Permission identifiers granted by the role. */
  permissions?: string[];
}
