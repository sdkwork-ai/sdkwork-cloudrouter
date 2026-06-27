import type { OpenAiFineTuningJob } from './open-ai-fine-tuning-job';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of fine-tuning jobs. */
export interface OpenAiFineTuningJobList {
  /** Fine-tuning jobs in the returned page. */
  data: OpenAiFineTuningJob[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
