import type { ProviderJsonValue } from './provider-json-value';

/** Mureka song generation request. */
export interface MurekaMusicGenerationRequest {
  /** Optional callback URL for task completion. */
  callback_url?: string;
  /** Requested duration in seconds. */
  duration?: number;
  /** Lyrics to sing, when the caller supplies them instead of a prompt. */
  lyrics?: string;
  /** Mureka music model id, for example mureka-o1. */
  model: string;
  /** Description of the song to generate. */
  prompt?: string;
  /** Optional reference audio URL that steers the style. */
  reference_audio_url?: string;
  /** Style or mood tags that steer the generation. */
  tags?: string[];
  /** Song title. */
  title?: string;
}
