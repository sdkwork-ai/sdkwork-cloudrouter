import type { ProviderJsonValue } from './provider-json-value';

/** One streamed Seed TTS frame. The vendor answers NDJSON frames carrying base64 `data`; the final frame has `code` 20000000. */
export interface BytedanceSpeechChunk {
  /** Frame status code; 20000000 marks the final frame. */
  code?: number;
  /** Base64 audio payload of this frame. */
  data?: string;
  /** Frame status message. */
  message?: string;
  /** Frame sequence number. */
  sequence?: number;
}
