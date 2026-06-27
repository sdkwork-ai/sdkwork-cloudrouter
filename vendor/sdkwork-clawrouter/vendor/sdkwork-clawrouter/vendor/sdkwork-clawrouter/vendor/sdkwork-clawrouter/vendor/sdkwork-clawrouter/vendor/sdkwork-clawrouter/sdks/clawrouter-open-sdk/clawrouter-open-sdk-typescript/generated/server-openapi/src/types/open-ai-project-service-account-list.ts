import type { OpenAiProjectServiceAccount } from './open-ai-project-service-account';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of project service accounts. */
export interface OpenAiProjectServiceAccountList {
  /** Project service accounts in the returned page. */
  data: OpenAiProjectServiceAccount[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
