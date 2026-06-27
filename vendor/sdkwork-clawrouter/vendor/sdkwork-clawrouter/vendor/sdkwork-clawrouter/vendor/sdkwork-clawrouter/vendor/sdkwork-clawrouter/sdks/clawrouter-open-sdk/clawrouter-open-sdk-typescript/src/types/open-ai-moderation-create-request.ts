import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to classify text or multimodal input for moderation. */
export interface OpenAiModerationCreateRequest {
  /** Text or multimodal input to classify. */
  input: string | string[] | ProviderJsonValue[];
  /** Moderation model id or Claw Router catalog key. */
  model: string;
}
