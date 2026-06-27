import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible fine-tuning job checkpoint object. */
export interface OpenAiFineTuningJobCheckpoint {
  /** Unix timestamp in seconds when the checkpoint was created. */
  created_at: string;
  /** Fine-tuned model checkpoint id. */
  fine_tuned_model_checkpoint?: string;
  /** Fine-tuning job identifier that owns this checkpoint. */
  fine_tuning_job_id?: string;
  /** Fine-tuning checkpoint identifier. */
  id: string;
  /** Checkpoint metrics returned by the upstream. */
  metrics?: ProviderJsonValue;
  /** Object type, normally fine_tuning.job.checkpoint. */
  object: 'fine_tuning.job.checkpoint';
  /** Training step number for this checkpoint. */
  step_number?: number;
}
