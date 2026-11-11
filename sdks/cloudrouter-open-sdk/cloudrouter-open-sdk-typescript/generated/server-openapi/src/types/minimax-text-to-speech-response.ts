import type { MinimaxBaseResp } from './minimax-base-resp';
import type { ProviderJsonValue } from './provider-json-value';

/** MiniMax T2A v2 response. data.audio is hex-encoded audio; usage_characters is the billed count. */
export interface MinimaxTextToSpeechResponse {
  /** Base resp field on the minimax text to speech response, using the minimax base resp module. */
  base_resp?: MinimaxBaseResp;
  /** Audio envelope carrying the hex-encoded audio payload. */
  data?: Record<string, ProviderJsonValue>;
  /** Synthesis metrics: audio_length, audio_size, word_count, and usage_characters. */
  extra_info?: Record<string, ProviderJsonValue>;
  /** MiniMax trace id for support. */
  trace_id?: string;
}
