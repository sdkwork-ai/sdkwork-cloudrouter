import type { MiniMaxMusicBaseResp } from './mini-max-music-base-resp';
import type { MiniMaxMusicData } from './mini-max-music-data';

/** MiniMax music generation response exposed by Cloud Router. */
export interface MiniMaxMusicGenerationResponse {
  base_resp?: MiniMaxMusicBaseResp;
  data?: MiniMaxMusicData;
  /** MiniMax trace identifier. */
  trace_id?: string;
}
