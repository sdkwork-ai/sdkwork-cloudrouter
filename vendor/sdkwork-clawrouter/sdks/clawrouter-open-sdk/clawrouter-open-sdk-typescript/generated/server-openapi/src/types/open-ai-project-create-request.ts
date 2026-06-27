import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a project. */
export interface OpenAiProjectCreateRequest {
  /** Developer-defined project metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable project name. */
  name: string;
}
