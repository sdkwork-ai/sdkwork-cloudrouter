import type { OpenAiFineTuningCheckpointPermission } from './open-ai-fine-tuning-checkpoint-permission';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of fine-tuning checkpoint permissions. */
export interface OpenAiFineTuningCheckpointPermissionList {
  /** Fine-tuning checkpoint permissions in the returned page. */
  data: OpenAiFineTuningCheckpointPermission[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
