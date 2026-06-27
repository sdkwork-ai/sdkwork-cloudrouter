import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible role assignment object. */
export interface OpenAiRoleAssignment {
  /** Unix timestamp in seconds when the assignment was created. */
  created_at?: string;
  /** Group identifier assigned to the role. */
  group_id?: string;
  /** Role assignment identifier. */
  id: string;
  /** Object type, normally role.assignment. */
  object: 'role.assignment';
  /** Project identifier associated with the assignment. */
  project_id?: string;
  /** Role identifier. */
  role_id: string;
  /** User identifier assigned to the role. */
  user_id?: string;
}
