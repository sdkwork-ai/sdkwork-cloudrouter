import type { OpenAiOrganizationUsageBucket } from './open-ai-organization-usage-bucket';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of organization usage buckets. */
export interface OpenAiOrganizationUsageList {
  /** Organization usage buckets in the returned page. */
  data: OpenAiOrganizationUsageBucket[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
