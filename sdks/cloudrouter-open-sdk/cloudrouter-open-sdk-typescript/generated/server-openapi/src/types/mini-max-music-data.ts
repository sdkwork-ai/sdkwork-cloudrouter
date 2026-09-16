import type { MiniMaxMusicExtraInfo } from './mini-max-music-extra-info';

/** MiniMax music generation data payload. */
export interface MiniMaxMusicData {
  /** MiniMax task status: 1 means in progress, 2 means finished. */
  status?: number;
  /** Generated audio URL when output_format is url, otherwise hex-encoded audio. */
  audio?: string;
  extra_info?: MiniMaxMusicExtraInfo;
}
