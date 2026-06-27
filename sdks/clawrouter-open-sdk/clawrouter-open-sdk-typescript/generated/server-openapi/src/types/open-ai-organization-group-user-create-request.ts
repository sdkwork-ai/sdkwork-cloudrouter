import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to add a user to an organization group. */
export interface OpenAiOrganizationGroupUserCreateRequest {
  /** Organization user identifier. */
  user_id: string;
}
