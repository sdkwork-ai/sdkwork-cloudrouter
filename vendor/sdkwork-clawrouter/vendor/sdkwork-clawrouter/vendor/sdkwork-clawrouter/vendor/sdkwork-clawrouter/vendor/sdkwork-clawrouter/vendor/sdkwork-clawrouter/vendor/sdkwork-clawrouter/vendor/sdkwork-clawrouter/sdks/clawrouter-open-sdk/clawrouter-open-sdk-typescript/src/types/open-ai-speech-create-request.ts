import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to synthesize speech audio. */
export interface OpenAiSpeechCreateRequest {
  /** Text or provider-compatible input to synthesize. */
  input: string | string[] | ProviderJsonValue[];
  /** Developer-defined speech metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Audio model id or Claw Router catalog key. */
  model: string;
  /** Requested audio response format. */
  response_format?: string;
  /** Speech speed multiplier when supported. */
  speed?: number;
  /** Voice identifier used for speech generation. */
  voice: string;
}
