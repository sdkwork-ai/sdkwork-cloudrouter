import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to add a group to a project. */
export interface OpenAiProjectGroupCreateRequest {
  /** Organization group identifier. */
  group_id: string;
}
