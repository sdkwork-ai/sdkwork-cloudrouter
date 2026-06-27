import type { OpenAiEvalRunOutputItem } from './open-ai-eval-run-output-item';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of eval run output items. */
export interface OpenAiEvalRunOutputItemList {
  /** Eval run output items in the returned page. */
  data: OpenAiEvalRunOutputItem[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
