import type { OpenAiFileReferenceInput } from './open-ai-file-reference-input';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai audio translation request schema exposed by Claw Router. */
export interface OpenAiAudioTranslationRequest {
  /** File field on the open ai audio translation request, using the open ai file reference input module. */
  file: OpenAiFileReferenceInput;
  /** Translation model id or Claw Router catalog key. */
  model: string;
  /** Optional text prompt to guide translation. */
  prompt?: string;
  /** Desired translation response format. */
  response_format?: string;
}
