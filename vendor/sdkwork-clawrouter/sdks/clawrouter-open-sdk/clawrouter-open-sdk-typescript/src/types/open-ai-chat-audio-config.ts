import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai chat audio config schema exposed by Claw Router. */
export interface OpenAiChatAudioConfig {
  /** Audio output format requested from the upstream. */
  format?: string;
  /** Voice identifier for audio output. */
  voice?: string;
}
