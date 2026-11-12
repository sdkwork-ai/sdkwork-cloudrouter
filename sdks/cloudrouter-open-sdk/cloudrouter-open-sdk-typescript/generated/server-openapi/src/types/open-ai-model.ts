import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai model schema exposed by Cloud Router. */
export interface OpenAiModel {
  /** Unix timestamp in seconds when the model was created, when known. */
  created?: string;
  /** Model display name from the Cloud Router catalog. */
  displayName?: string;
  /** Model identifier or Cloud Router catalog key. */
  id: string;
  /** Object type, always model. */
  object: 'model';
  /** Organization or provider that owns the model. */
  owned_by: string;
  /** Display name of the model vendor from the Cloud Router catalog. */
  vendorDisplayName?: string;
}
