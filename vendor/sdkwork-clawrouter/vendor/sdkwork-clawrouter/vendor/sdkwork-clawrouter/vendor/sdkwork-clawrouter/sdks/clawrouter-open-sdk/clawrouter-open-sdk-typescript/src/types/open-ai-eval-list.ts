import type { OpenAiEval } from './open-ai-eval';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of evals. */
export interface OpenAiEvalList {
  /** Evals in the returned page. */
  data: OpenAiEval[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
