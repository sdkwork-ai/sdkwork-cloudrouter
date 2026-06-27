import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai chat input audio schema exposed by Claw Router. */
export interface OpenAiChatInputAudio {
  /** Base64-encoded audio data. */
  data: string;
  /** Input audio format. */
  format: string;
}
