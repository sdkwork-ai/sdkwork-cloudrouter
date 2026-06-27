import type { OpenAiImageReferenceInput } from './open-ai-image-reference-input';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai image variation request schema exposed by Claw Router. */
export interface OpenAiImageVariationRequest {
  /** Image field on the open ai image variation request, using the open ai image reference input module. */
  image: OpenAiImageReferenceInput;
  /** Image variation model id or Claw Router catalog key. */
  model: string;
  /** Requested image size. */
  size?: string;
}
