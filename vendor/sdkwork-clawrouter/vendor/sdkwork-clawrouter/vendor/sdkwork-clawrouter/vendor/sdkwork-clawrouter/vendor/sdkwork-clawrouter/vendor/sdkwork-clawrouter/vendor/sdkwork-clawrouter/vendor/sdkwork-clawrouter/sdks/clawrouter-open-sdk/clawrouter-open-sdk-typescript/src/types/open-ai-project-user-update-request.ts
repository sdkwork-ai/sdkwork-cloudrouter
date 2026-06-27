import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update a project user. */
export interface OpenAiProjectUserUpdateRequest {
  /** Project role identifier. */
  role?: string;
}
