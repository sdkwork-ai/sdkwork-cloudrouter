import type { ProviderJsonValue } from './provider-json-value';

/** MiniMax TTS streaming options. */
export interface MinimaxStreamOptions {
  /** Omit the aggregated audio from the final chunk. */
  exclude_aggregated_audio?: boolean;
}
