import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a fine-tuning checkpoint permission. */
export interface OpenAiFineTuningCheckpointPermissionCreateRequest {
  /** Project identifier to grant access to the checkpoint. */
  project_id: string;
}
