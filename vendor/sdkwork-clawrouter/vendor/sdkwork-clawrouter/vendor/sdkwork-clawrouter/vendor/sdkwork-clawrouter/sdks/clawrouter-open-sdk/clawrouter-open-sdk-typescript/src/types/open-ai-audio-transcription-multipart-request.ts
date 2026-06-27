import type { OpenAiBinaryFilePart } from './open-ai-binary-file-part';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai audio transcription multipart request schema exposed by Claw Router. */
export interface OpenAiAudioTranscriptionMultipartRequest {
  /** File field on the open ai audio transcription multipart request, using the open ai binary file part module. */
  file: OpenAiBinaryFilePart;
  /** Optional source language hint. */
  language?: string;
  /** Transcription model id or Claw Router catalog key. */
  model: string;
  /** Optional text prompt to guide transcription. */
  prompt?: string;
  /** Desired transcription response format. */
  response_format?: string;
}
