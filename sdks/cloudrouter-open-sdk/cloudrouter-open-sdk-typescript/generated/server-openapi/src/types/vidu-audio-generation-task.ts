import type { ProviderJsonValue } from './provider-json-value';
import type { ViduCreation } from './vidu-creation';

/** Vidu vidu audio generation task schema exposed by Cloud Router vendor routing. */
export interface ViduAudioGenerationTask {
  /** Task creation timestamp. */
  created_at?: string;
  /** Generated audio records when included by Vidu. */
  creations?: ViduCreation[];
  /** Credits consumed by the task. */
  credits?: number;
  /** Requested duration echoed back by Vidu. */
  duration?: number;
  /** Vidu error code when the task failed. */
  err_code?: string;
  /** Vidu audio model used by the task. */
  model?: string;
  /** Prompt echoed back by Vidu. */
  prompt?: string;
  /** Seed used by Vidu. */
  seed?: number;
  /** Vidu task state. */
  state?: 'created' | 'queueing' | 'processing' | 'success' | 'failed';
  /** Vidu audio task identifier. */
  task_id?: string;
}
