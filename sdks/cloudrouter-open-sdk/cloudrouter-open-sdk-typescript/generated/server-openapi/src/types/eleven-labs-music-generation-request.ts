import type { ElevenLabsCompositionPlan } from './eleven-labs-composition-plan';
import type { ElevenLabsMusicPrompt } from './eleven-labs-music-prompt';
import type { ProviderJsonValue } from './provider-json-value';

/** ElevenLabs music generation request (`POST /v1/music`). Supply `prompt`, or `composition_plan`, but not both. */
export interface ElevenLabsMusicGenerationRequest {
  /** Detailed composition plan; mutually exclusive with `prompt`. */
  composition_plan?: ElevenLabsMusicPrompt | ElevenLabsCompositionPlan;
  /** Finetune id to apply. */
  finetune_id?: string;
  /** How strongly the finetune influences the generation. */
  finetune_strength?: number;
  /** Guarantee an instrumental result. */
  force_instrumental?: boolean;
  /** Generation mode hint; only usable with `prompt`. */
  generation_mode?: 'track' | 'loop' | 'ambience' | 'video_to_music';
  /** Lyrics to use for the generation. */
  lyrics_text?: string;
  /** Music model id. */
  model_id?: 'music_v1' | 'music_v2' | 'music_v2_5';
  /** Song length in milliseconds; only used with `prompt`. */
  music_length_ms?: number;
  /** Music prompt field on the eleven labs music generation request, using the eleven labs music prompt module. */
  music_prompt?: ElevenLabsMusicPrompt;
  /** Text prompt to generate a song from; mutually exclusive with `composition_plan`. */
  prompt?: string;
  /** How strictly composition-plan section durations are enforced. */
  respect_sections_durations?: boolean;
  /** Random seed; cannot be used with `prompt`. */
  seed?: number;
  /** Sign the generated song with C2PA; mp3 only. */
  sign_with_c2pa?: boolean;
  /** Store the generated song for inpainting. */
  store_for_inpainting?: boolean;
  /** Spell proper names phonetically in the lyrics. */
  use_phonetic_names?: boolean;
}
