import type { OpenAiRoleAssignment } from './open-ai-role-assignment';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of role assignments. */
export interface OpenAiRoleAssignmentList {
  /** Role assignments in the returned page. */
  data: OpenAiRoleAssignment[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
