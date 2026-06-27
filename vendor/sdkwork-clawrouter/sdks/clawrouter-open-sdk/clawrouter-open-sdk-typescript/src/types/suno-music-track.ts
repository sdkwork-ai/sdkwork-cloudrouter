import type { ProviderJsonValue } from './provider-json-value';

/** Suno-compatible suno music track schema exposed by Claw Router vendor routing. */
export interface SunoMusicTrack {
  /** Generated audio URL. */
  audio_url?: string;
  /** Track duration in seconds. */
  duration?: number;
  /** Track identifier. */
  id?: string;
  /** Cover image URL. */
  image_url?: string;
  /** Generated lyrics. */
  lyrics?: string;
  /** Track title. */
  title?: string;
  /** Generated video URL when supplied. */
  video_url?: string;
}
