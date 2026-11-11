import type { ProviderJsonValue } from './provider-json-value';

/** Mureka song generation task and its produced audio. */
export interface MurekaMusicGenerationTask {
  /** Generated audio URL once the task succeeded. */
  audio_url?: string;
  /** Generated duration in seconds. */
  duration?: number;
  /** Task error envelope with code and message. */
  error?: Record<string, ProviderJsonValue>;
  /** Mureka task identifier when the provider echoes it under id. */
  id?: string;
  /** Task status: preparing, running, succeeded, or failed. */
  status?: string;
  /** Mureka task identifier. */
  task_id?: string;
  /** Generated song title. */
  title?: string;
}
