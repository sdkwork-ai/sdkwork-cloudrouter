import type { ProviderJsonValue } from './provider-json-value';

/** MiniMax TTS voice effects. */
export interface MinimaxVoiceModify {
  /** Stronger/softer adjustment. */
  intensity?: number;
  /** Deepen/brighten adjustment. */
  pitch?: number;
  /** One optional sound effect. */
  sound_effects?: 'spacious_echo' | 'auditorium_echo' | 'lofi_telephone' | 'robotic';
  /** Nasal/crisp adjustment. */
  timbre?: number;
}
