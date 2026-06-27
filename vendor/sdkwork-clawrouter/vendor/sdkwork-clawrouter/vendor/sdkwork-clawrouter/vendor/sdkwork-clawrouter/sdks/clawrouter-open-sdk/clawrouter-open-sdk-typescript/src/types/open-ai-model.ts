import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai model schema exposed by Claw Router. */
export interface OpenAiModel {
  /** Unix timestamp in seconds when the model was created, when known. */
  created?: string;
  /** Model identifier or Claw Router catalog key. */
  id: string;
  /** Object type, always model. */
  object: 'model';
  /** Organization or provider that owns the model. */
  owned_by: string;
}
