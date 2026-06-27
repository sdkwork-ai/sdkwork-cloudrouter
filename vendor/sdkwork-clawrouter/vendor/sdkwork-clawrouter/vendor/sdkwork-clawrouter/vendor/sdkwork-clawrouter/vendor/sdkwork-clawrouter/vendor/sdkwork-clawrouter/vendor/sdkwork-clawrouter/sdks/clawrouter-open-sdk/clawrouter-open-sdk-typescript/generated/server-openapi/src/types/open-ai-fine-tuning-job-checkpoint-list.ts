import type { OpenAiFineTuningJobCheckpoint } from './open-ai-fine-tuning-job-checkpoint';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of fine-tuning job checkpoints. */
export interface OpenAiFineTuningJobCheckpointList {
  /** Fine-tuning job checkpoints in the returned page. */
  data: OpenAiFineTuningJobCheckpoint[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
