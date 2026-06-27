import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible fine-tuning job object. */
export interface OpenAiFineTuningJob {
  /** Unix timestamp in seconds when the job was created. */
  created_at: string;
  /** Fine-tuning error object when the job fails. */
  error?: ProviderJsonValue;
  /** Fine-tuned model id when available. */
  fine_tuned_model?: string;
  /** Unix timestamp in seconds when the job finished. */
  finished_at?: string;
  /** Fine-tuning hyperparameters. */
  hyperparameters?: ProviderJsonValue;
  /** Fine-tuning job identifier. */
  id: string;
  /** Developer-defined fine-tuning metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Base model id. */
  model: string;
  /** Object type, normally fine_tuning.job. */
  object: 'fine_tuning.job';
  /** Organization identifier that owns the job. */
  organization_id?: string;
  /** Result file identifiers returned by the job. */
  result_files?: string[];
  /** Fine-tuning job status. */
  status: string;
  /** Number of trained tokens. */
  trained_tokens?: number;
  /** Training file identifier. */
  training_file?: string;
  /** Validation file identifier. */
  validation_file?: string;
}
