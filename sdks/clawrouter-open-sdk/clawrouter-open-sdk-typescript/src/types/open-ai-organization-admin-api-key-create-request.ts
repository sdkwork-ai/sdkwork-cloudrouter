import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create an organization admin API key. */
export interface OpenAiOrganizationAdminApiKeyCreateRequest {
  /** Human-readable API key name. */
  name: string;
}
