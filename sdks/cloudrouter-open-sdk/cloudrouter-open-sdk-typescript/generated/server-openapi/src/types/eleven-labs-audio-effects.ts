import type { ProviderJsonValue } from './provider-json-value';

/** ElevenLabs audio effects applied to generated speech. */
export interface ElevenLabsAudioEffects {
  /** Background noise bed id such as `cafe` or `keyboard`. */
  background_noise_id?: string;
  /** Perceived speaker distance in [0, 1]. */
  distance?: number;
  /** Reverb environment id such as `small_room` or `hall`; forces stereo output. */
  environment_id?: string;
  /** Filter preset id such as `phone` or `old_radio`. */
  filter_preset_id?: string;
  /** Voice stereo position from -1 (hard left) to 1 (hard right). */
  pan?: number;
  /** How much of the voice feeds the reverb in [0, 1]; only applies when `environment_id` is set. */
  send_level?: number;
}
