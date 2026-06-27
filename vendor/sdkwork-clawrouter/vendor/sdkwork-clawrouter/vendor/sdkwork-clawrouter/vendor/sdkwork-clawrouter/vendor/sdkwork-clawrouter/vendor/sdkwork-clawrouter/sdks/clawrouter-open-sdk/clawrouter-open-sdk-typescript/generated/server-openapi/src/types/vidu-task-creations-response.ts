import type { ProviderJsonValue } from './provider-json-value';
import type { ViduCreation } from './vidu-creation';

/** Vidu vidu task creations response schema exposed by Claw Router vendor routing. */
export interface ViduTaskCreationsResponse {
  /** Task creation timestamp. */
  created_at?: string;
  /** Vidu creation records for the task. */
  creations?: ViduCreation[];
  /** Vidu model used by the task. */
  model?: string;
  /** Vidu task state. */
  state?: string;
  /** Vidu creation task identifier. */
  task_id?: string;
}
