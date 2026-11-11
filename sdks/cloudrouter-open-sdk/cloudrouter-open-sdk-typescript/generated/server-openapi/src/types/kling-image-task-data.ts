import type { KlingImageTaskResult } from './kling-image-task-result';
import type { ProviderJsonValue } from './provider-json-value';

/** Kling image task record. */
export interface KlingImageTaskData {
  /** Creation time as a Unix timestamp in milliseconds. */
  created_at?: number;
  /** Kling task id. */
  task_id?: string;
  /** Creation parameters echoed back by Kling. */
  task_info?: Record<string, ProviderJsonValue>;
  /** Generated images; present once the task succeeds. */
  task_result?: KlingImageTaskResult;
  /** Task status. */
  task_status?: 'submitted' | 'processing' | 'succeed' | 'failed';
  /** Failure reason or status detail. */
  task_status_msg?: string;
  /** Last update time as a Unix timestamp in milliseconds. */
  updated_at?: number;
}
