import type { OpenAiOrganizationUser } from './open-ai-organization-user';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of organization users. */
export interface OpenAiOrganizationUserList {
  /** Organization users in the returned page. */
  data: OpenAiOrganizationUser[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
