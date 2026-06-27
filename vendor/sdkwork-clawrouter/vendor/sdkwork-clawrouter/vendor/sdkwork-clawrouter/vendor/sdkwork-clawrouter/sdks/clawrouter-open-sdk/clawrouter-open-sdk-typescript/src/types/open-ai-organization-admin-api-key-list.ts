import type { OpenAiOrganizationAdminApiKey } from './open-ai-organization-admin-api-key';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of organization admin API keys. */
export interface OpenAiOrganizationAdminApiKeyList {
  /** Organization admin api keys in the returned page. */
  data: OpenAiOrganizationAdminApiKey[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
