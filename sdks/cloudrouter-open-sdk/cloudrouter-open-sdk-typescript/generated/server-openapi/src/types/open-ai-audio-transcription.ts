import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible audio transcription response. */
export interface OpenAiAudioTranscription {
  /** Audio duration in seconds when returned. */
  duration?: number;
  /** Detected or requested language. */
  language?: string;
  /** Timestamped transcription segments when returned. */
  segments?: ProviderJsonValue[];
  /** Transcribed text. */
  text: string;
  /** Timestamped word records when returned. */
  words?: ProviderJsonValue[];
}
