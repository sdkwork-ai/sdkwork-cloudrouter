import type { ProviderJsonValue } from './provider-json-value';

/** One voice in a mixed-voice TTS request. */
export interface MinimaxTimbreWeight {
  /** Voice id. */
  voice_id: string;
  /** Relative weight of this voice. */
  weight: number;
}
