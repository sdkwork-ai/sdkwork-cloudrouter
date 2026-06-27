import type { ProviderGeneratedMedia } from './provider-generated-media';
import type { ProviderJsonValue } from './provider-json-value';
import type { ProviderTaskError } from './provider-task-error';

/** Kling-compatible kling video generation task schema exposed by Claw Router vendor routing. */
export interface KlingVideoGenerationTask {
  /** Task creation timestamp. */
  created_at?: string;
  /** Error field on the kling video generation task, using the provider task error module. */
  error?: ProviderTaskError;
  /** Provider task or video identifier. */
  id?: string;
  /** Model used for generation. */
  model?: string;
  /** Prompt used for generation. */
  prompt?: string;
  /** Provider task state. */
  state?: string;
  /** Task status. */
  status?: string;
  /** Provider video generation task identifier. */
  task_id?: string;
  /** Task update timestamp. */
  updated_at?: string;
  /** Generated video assets. */
  videos?: ProviderGeneratedMedia[];
}
