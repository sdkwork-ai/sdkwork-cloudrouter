import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update a skill. */
export interface OpenAiSkillUpdateRequest {
  /** Human-readable skill description. */
  description?: string;
  /** Developer-defined skill metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable skill name. */
  name?: string;
}
