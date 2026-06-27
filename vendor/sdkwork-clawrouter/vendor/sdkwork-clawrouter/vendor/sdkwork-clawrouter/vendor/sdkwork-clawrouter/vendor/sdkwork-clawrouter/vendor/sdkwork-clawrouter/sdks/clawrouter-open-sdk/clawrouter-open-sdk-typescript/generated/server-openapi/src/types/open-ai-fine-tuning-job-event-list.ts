import type { OpenAiFineTuningJobEvent } from './open-ai-fine-tuning-job-event';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of fine-tuning job events. */
export interface OpenAiFineTuningJobEventList {
  /** Fine-tuning job events in the returned page. */
  data: OpenAiFineTuningJobEvent[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
