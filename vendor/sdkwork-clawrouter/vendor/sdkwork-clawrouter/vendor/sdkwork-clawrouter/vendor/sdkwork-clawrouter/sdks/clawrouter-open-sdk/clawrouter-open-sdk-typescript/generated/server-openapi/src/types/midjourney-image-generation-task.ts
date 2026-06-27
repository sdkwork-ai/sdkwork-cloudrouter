import type { ProviderGeneratedMedia } from './provider-generated-media';
import type { ProviderJsonValue } from './provider-json-value';
import type { ProviderTaskError } from './provider-task-error';

/** Midjourney-compatible midjourney image generation task schema exposed by Claw Router vendor routing. */
export interface MidjourneyImageGenerationTask {
  /** Task creation timestamp. */
  created_at?: string;
  /** Error field on the midjourney image generation task, using the provider task error module. */
  error?: ProviderTaskError;
  /** Provider task or image identifier. */
  id?: string;
  /** Generated image assets. */
  images?: ProviderGeneratedMedia[];
  /** Model used for generation. */
  model?: string;
  /** Prompt used for generation. */
  prompt?: string;
  /** Provider task state. */
  state?: string;
  /** Task status. */
  status?: string;
  /** Provider image generation task identifier. */
  task_id?: string;
  /** Task update timestamp. */
  updated_at?: string;
}
