import type { OpenAiOrganizationCostBucket } from './open-ai-organization-cost-bucket';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of organization cost buckets. */
export interface OpenAiOrganizationCostList {
  /** Organization cost buckets in the returned page. */
  data: OpenAiOrganizationCostBucket[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
