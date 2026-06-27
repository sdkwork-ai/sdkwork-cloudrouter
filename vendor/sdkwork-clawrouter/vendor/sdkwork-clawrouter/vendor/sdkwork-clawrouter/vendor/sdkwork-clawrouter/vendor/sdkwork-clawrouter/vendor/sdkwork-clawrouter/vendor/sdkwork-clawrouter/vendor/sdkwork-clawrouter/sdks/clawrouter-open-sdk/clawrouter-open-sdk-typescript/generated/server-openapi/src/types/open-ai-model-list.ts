import type { OpenAiModel } from './open-ai-model';

/** OpenAI-compatible open ai model list schema exposed by Claw Router. */
export interface OpenAiModelList {
  /** Model objects available to the caller. */
  data: OpenAiModel[];
  /** Object type, always list. */
  object: 'list';
}
