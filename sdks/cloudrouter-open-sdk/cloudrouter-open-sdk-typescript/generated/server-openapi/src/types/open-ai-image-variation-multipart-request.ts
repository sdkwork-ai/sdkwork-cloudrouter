import type { OpenAiBinaryFilePart } from './open-ai-binary-file-part';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai image variation multipart request schema exposed by Cloud Router. */
export interface OpenAiImageVariationMultipartRequest {
  /** Image field on the open ai image variation multipart request, using the open ai binary file part module. */
  image: OpenAiBinaryFilePart;
  /** Image variation model id or Cloud Router catalog key. */
  model: string;
  /** Requested image size. */
  size?: string;
}
