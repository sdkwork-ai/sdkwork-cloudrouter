import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a role assignment. */
export interface OpenAiRoleAssignmentCreateRequest {
  /** Role identifier to assign. */
  role_id: string;
}
