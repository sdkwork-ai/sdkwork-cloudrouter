import type { ProviderJsonValue } from './provider-json-value';

/** Kling text-to-sound-effect request. */
export interface KlingSoundGenerationRequest {
  /** Callback URL notified when the task changes state. */
  callback_url?: string;
  /** Generated duration in seconds, 3.0 to 10.0. */
  duration: number;
  /** Caller-supplied task id, unique per account. */
  external_task_id?: string;
  /** Description of the sound effect to generate. */
  prompt: string;
}
