import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update a project. */
export interface OpenAiProjectUpdateRequest {
  /** Developer-defined project metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable project name. */
  name?: string;
}
