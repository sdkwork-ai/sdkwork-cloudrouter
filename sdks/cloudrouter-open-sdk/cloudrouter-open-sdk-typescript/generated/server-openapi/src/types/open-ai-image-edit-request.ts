import type { OpenAiImageReferenceInput } from './open-ai-image-reference-input';
import type { OpenAiImageReferenceInputList } from './open-ai-image-reference-input-list';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai image edit request schema exposed by Cloud Router. */
export interface OpenAiImageEditRequest {
  /** Image field on the open ai image edit request, using the open ai image reference input list module. */
  image?: OpenAiImageReferenceInputList;
  /** Mask field on the open ai image edit request, using the open ai image reference input module. */
  mask?: OpenAiImageReferenceInput;
  /** Image edit model id or Cloud Router catalog key. */
  model: string;
  /** Text prompt describing the edit. */
  prompt: string;
}
