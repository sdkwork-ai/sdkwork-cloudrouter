import type { ProviderJsonValue } from './provider-json-value';
import type { ViduCreation } from './vidu-creation';

/** Vidu vidu image generation task schema exposed by Claw Router vendor routing. */
export interface ViduImageGenerationTask {
  /** Task creation timestamp. */
  created_at?: string;
  /** Generated media records when included by Vidu. */
  creations?: ViduCreation[];
  /** Vidu model used by the task. */
  model?: string;
  /** Vidu task state. */
  state?: string;
  /** Vidu image task identifier. */
  task_id?: string;
}
