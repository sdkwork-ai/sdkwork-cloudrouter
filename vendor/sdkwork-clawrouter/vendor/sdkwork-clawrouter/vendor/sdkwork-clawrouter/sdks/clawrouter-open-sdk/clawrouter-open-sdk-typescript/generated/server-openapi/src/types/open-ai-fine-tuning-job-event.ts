import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible fine-tuning job event object. */
export interface OpenAiFineTuningJobEvent {
  /** Unix timestamp in seconds when the event was created. */
  created_at: string;
  /** Provider-specific event data. */
  data?: ProviderJsonValue;
  /** Fine-tuning job event identifier. */
  id: string;
  /** Event severity level. */
  level?: string;
  /** Event message. */
  message: string;
  /** Object type, normally fine_tuning.job.event. */
  object: 'fine_tuning.job.event';
  /** Event type when returned. */
  type?: string;
}
