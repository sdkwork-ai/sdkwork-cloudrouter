import type { ProviderGeneratedMedia } from './provider-generated-media';
import type { ProviderJsonValue } from './provider-json-value';
import type { ProviderTaskError } from './provider-task-error';
import type { ProviderTaskResult } from './provider-task-result';
import type { VolcengineContentPart } from './volcengine-content-part';

/** Volcengine Ark volcengine content generation task schema exposed by Claw Router vendor routing. */
export interface VolcengineContentGenerationTask {
  /** Input or output content parts associated with the task. */
  content?: VolcengineContentPart[];
  /** Task creation timestamp. */
  created_at?: string;
  /** Error field on the volcengine content generation task, using the provider task error module. */
  error?: ProviderTaskError;
  /** Provider task or video identifier. */
  id?: string;
  /** Model used for generation. */
  model?: string;
  /** Prompt used for generation. */
  prompt?: string;
  /** Result field on the volcengine content generation task, using the provider task result module. */
  result?: ProviderTaskResult;
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
