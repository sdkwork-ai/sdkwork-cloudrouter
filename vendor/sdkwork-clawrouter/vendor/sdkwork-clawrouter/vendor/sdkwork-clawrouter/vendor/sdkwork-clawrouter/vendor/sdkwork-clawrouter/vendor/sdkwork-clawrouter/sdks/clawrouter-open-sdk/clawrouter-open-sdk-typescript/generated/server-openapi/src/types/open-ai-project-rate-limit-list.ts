import type { OpenAiProjectRateLimit } from './open-ai-project-rate-limit';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of project rate limits. */
export interface OpenAiProjectRateLimitList {
  /** Project rate limits in the returned page. */
  data: OpenAiProjectRateLimit[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
