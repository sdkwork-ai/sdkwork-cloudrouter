import type { ProviderJsonValue } from './provider-json-value';

/** Suno-compatible suno music generation response schema exposed by Claw Router vendor routing. */
export interface SunoMusicGenerationResponse {
  /** Task creation timestamp. */
  created_at?: string;
  /** Suno task identifier. */
  id?: string;
  /** Task status. */
  status?: string;
  /** Suno task identifier. */
  task_id?: string;
}
