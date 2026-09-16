import type { MiniMaxMusicExtraInfo } from './mini-max-music-extra-info';
import type { ProviderJsonValue } from './provider-json-value';

/** Mini max music data schema exposed by Cloud Router. */
export interface MiniMaxMusicData {
  /** Generated audio URL when output_format is url, otherwise hex-encoded audio. */
  audio?: string;
  /** Extra info field on the mini max music data, using the mini max music extra info module. */
  extra_info?: MiniMaxMusicExtraInfo;
  /** MiniMax task status: 1 means in progress, 2 means finished. */
  status?: number;
}
