import type { ProviderJsonValue } from './provider-json-value';
import type { ViduCreation } from './vidu-creation';

/** Vidu vidu image generation task schema exposed by Cloud Router vendor routing. */
export interface ViduImageGenerationTask {
  /** Requested aspect ratio echoed back by Vidu. */
  aspect_ratio?: string;
  /** Callback URL echoed back by Vidu. */
  callback_url?: string;
  /** Task creation timestamp. */
  created_at?: string;
  /** Generated media records when included by Vidu. */
  creations?: ViduCreation[];
  /** Credits consumed by the task. */
  credits?: number;
  /** Requested duration echoed back by Vidu. */
  duration?: number;
  /** Vidu error code when the task failed. */
  err_code?: string;
  /** Images echoed back by Vidu for the image task. */
  images?: string[];
  /** Vidu model used by the task. */
  model?: string;
  /** Whether off-peak mode was used. */
  off_peak?: boolean;
  /** Opaque payload echoed back by Vidu. */
  payload?: string;
  /** Prompt echoed back by Vidu. */
  prompt?: string;
  /** Requested resolution echoed back by Vidu. */
  resolution?: string;
  /** Seed used by Vidu. */
  seed?: number;
  /** Vidu task state. */
  state?: 'created' | 'queueing' | 'processing' | 'success' | 'failed';
  /** Vidu image task identifier. */
  task_id?: string;
  /** Whether the task requested a watermark. */
  watermark?: boolean;
}
