import type { OpenAiBinaryFilePart } from './open-ai-binary-file-part';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai audio translation multipart request schema exposed by Claw Router. */
export interface OpenAiAudioTranslationMultipartRequest {
  /** File field on the open ai audio translation multipart request, using the open ai binary file part module. */
  file: OpenAiBinaryFilePart;
  /** Translation model id or Claw Router catalog key. */
  model: string;
  /** Optional text prompt to guide translation. */
  prompt?: string;
  /** Desired translation response format. */
  response_format?: string;
}
