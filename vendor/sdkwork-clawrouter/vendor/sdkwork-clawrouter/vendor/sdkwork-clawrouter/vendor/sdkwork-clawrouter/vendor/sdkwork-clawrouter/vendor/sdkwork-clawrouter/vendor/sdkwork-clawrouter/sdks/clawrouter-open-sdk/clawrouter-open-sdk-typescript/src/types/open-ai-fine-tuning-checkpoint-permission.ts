import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible fine-tuning checkpoint permission object. */
export interface OpenAiFineTuningCheckpointPermission {
  /** Unix timestamp in seconds when the permission was created. */
  created_at: string;
  /** Fine-tuning checkpoint permission identifier. */
  id: string;
  /** Object type, normally fine_tuning.checkpoint.permission. */
  object: 'fine_tuning.checkpoint.permission';
  /** Project identifier granted access to the checkpoint. */
  project_id: string;
}
