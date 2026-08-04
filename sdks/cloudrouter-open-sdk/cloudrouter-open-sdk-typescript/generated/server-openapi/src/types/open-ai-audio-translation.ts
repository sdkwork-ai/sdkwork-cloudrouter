import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible audio translation response. */
export interface OpenAiAudioTranslation {
  /** Audio duration in seconds when returned. */
  duration?: number;
  /** Timestamped translation segments when returned. */
  segments?: ProviderJsonValue[];
  /** Translated text. */
  text: string;
}
