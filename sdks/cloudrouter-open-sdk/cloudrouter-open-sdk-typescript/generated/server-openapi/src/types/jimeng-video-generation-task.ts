import type { ProviderJsonValue } from './provider-json-value';

/** Jimeng video generation task and its generated video. */
export interface JimengVideoGenerationTask {
  /** Task creation timestamp in Unix seconds. */
  created_at?: number;
  /** Task error envelope with code and message. */
  error?: Record<string, ProviderJsonValue>;
  /** Jimeng task identifier when the provider echoes it under id. */
  id?: string;
  /** Task status, for example queued, running, or succeeded. */
  status?: string;
  /** Jimeng task identifier. */
  task_id?: string;
  /** Generated video URL once the task succeeded. */
  video_url?: string;
}
