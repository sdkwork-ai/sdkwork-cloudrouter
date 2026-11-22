import type { OpenAiModelGroup } from './open-ai-model-group';

/** OpenAI-compatible open ai model group list schema exposed by Cloud Router. */
export interface OpenAiModelGroupList {
  /** Account groups the caller can route this model through, in failover priority order. */
  data: OpenAiModelGroup[];
  /** Object type, always list. */
  object: 'list';
}
