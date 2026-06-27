import type { OpenAiBinaryFilePart } from './open-ai-binary-file-part';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai image edit multipart request schema exposed by Claw Router. */
export interface OpenAiImageEditMultipartRequest {
  /** Image field on the open ai image edit multipart request, using the open ai binary file part module. */
  image: OpenAiBinaryFilePart;
  /** Mask field on the open ai image edit multipart request, using the open ai binary file part module. */
  mask?: OpenAiBinaryFilePart;
  /** Image edit model id or Claw Router catalog key. */
  model: string;
  /** Text prompt describing the edit. */
  prompt: string;
}
