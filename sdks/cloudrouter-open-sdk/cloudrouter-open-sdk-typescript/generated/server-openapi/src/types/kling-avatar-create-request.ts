import type { ProviderJsonValue } from './provider-json-value';

/** Kling-compatible kling avatar create request schema exposed by Cloud Router vendor routing. */
export interface KlingAvatarCreateRequest {
  /** Driving audio URL used when voice_mode is audio. */
  audio_url?: string;
  /** Optional callback URL. */
  callback_url?: string;
  /** Character image URL driving the digital human. */
  human_image: string;
  /** Kling avatar model id, for example kling-ai-avatar-v2. */
  model_name?: string;
  /** Optional expression or performance description for the avatar. */
  prompt?: string;
  /** Driving speech text used when voice_mode is tts. */
  text?: string;
  /** Optional voice id for the tts mode. */
  voice_id?: string;
  /** Optional speech language for the tts mode. */
  voice_language?: string;
  /** Voice input mode, for example audio or tts. */
  voice_mode?: string;
}
