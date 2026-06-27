import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create an organization group. */
export interface OpenAiOrganizationGroupCreateRequest {
  /** Human-readable group description. */
  description?: string;
  /** Developer-defined group metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable group name. */
  name: string;
}
