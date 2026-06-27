import type { OpenAiThreadMessage } from './open-ai-thread-message';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of thread messages. */
export interface OpenAiThreadMessageList {
  /** Thread messages in the returned page. */
  data: OpenAiThreadMessage[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
