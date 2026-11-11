import type { MiniMaxMusicBaseResp } from './mini-max-music-base-resp';
import type { MiniMaxMusicData } from './mini-max-music-data';
import type { ProviderJsonValue } from './provider-json-value';

/** Mini max music generation response schema exposed by Cloud Router. */
export interface MiniMaxMusicGenerationResponse {
  /** Base resp field on the mini max music generation response, using the mini max music base resp module. */
  base_resp?: MiniMaxMusicBaseResp;
  /** Data field on the mini max music generation response, using the mini max music data module. */
  data?: MiniMaxMusicData;
  /** MiniMax trace identifier. */
  trace_id?: string;
}
