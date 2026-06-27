import type { ProviderJsonValue } from './provider-json-value';

/** Suno-compatible suno music generation request schema exposed by Claw Router vendor routing. */
export interface SunoMusicGenerationRequest {
  /** Optional callback URL. */
  callback_url?: string;
  /** Requested duration in seconds. */
  duration?: number;
  /** Suno-compatible model identifier. */
  model?: string;
  /** Musical styles to avoid. */
  negative_tags?: string;
  /** Lyrics or text prompt for music generation. */
  prompt: string;
  /** Musical style tags. */
  tags?: string;
  /** Requested song title. */
  title?: string;
}
