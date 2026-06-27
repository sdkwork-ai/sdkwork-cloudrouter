import type { ProviderJsonValue } from './provider-json-value';
import type { ProviderTaskError } from './provider-task-error';
import type { SunoMusicTrack } from './suno-music-track';

/** Suno-compatible suno music generation task response schema exposed by Claw Router vendor routing. */
export interface SunoMusicGenerationTaskResponse {
  /** Task creation timestamp. */
  created_at?: string;
  /** Error field on the suno music generation task response, using the provider task error module. */
  error?: ProviderTaskError;
  /** Suno task identifier. */
  id?: string;
  /** Task status. */
  status?: string;
  /** Suno task identifier. */
  task_id?: string;
  /** Generated song title. */
  title?: string;
  /** Generated music tracks. */
  tracks?: SunoMusicTrack[];
  /** Task update timestamp. */
  updated_at?: string;
}
