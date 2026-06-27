import type { OpenAiFileReferenceInput } from './open-ai-file-reference-input';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai audio transcription request schema exposed by Claw Router. */
export interface OpenAiAudioTranscriptionRequest {
  /** File field on the open ai audio transcription request, using the open ai file reference input module. */
  file: OpenAiFileReferenceInput;
  /** Optional source language hint. */
  language?: string;
  /** Transcription model id or Claw Router catalog key. */
  model: string;
  /** Optional text prompt to guide transcription. */
  prompt?: string;
  /** Desired transcription response format. */
  response_format?: string;
}
