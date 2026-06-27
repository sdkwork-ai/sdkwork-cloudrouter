import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to add a user to a project. */
export interface OpenAiProjectUserCreateRequest {
  /** Project role identifier. */
  role: string;
  /** Organization user identifier. */
  user_id: string;
}
