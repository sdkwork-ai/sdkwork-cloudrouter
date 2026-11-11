import type { OpenAiResponseInputItem } from './open-ai-response-input-item';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of response input items. */
export interface OpenAiResponseInputItemList {
  /** Response input items in the returned page. */
  data: OpenAiResponseInputItem[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
