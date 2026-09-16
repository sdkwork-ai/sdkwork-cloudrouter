import type { ProviderJsonValue } from './provider-json-value';

/** Kling avatar (digital human) video generation request schema exposed by Cloud Router vendor routing. */
export interface KlingAvatarCreateRequest {
  /** Kling avatar model id, for example kling-ai-avatar-v2. */
  model_name?: string;
  /** Character image URL driving the digital human. */
  human_image: string;
  /** Optional expression or performance description for the avatar. */
  prompt?: string;
  /** Voice input mode, for example audio or tts. */
  voice_mode?: string;
  /** Driving audio URL used when voice_mode is audio. */
  audio_url?: string;
  /** Driving speech text used when voice_mode is tts. */
  text?: string;
  /** Optional voice id for the tts mode. */
  voice_id?: string;
  /** Optional speech language for the tts mode. */
  voice_language?: string;
  /** Optional callback URL. */
  callback_url?: string;
}
