import type { ProviderGeneratedMedia } from './provider-generated-media';
import type { ProviderJsonValue } from './provider-json-value';

/** DashScope asynchronous task record shared by task submission and task polling. */
export interface AlibabaAsyncTask {
  /** DashScope task error code. */
  code?: string;
  /** Completion time formatted as `YYYY-MM-DD HH:mm:ss.SSS`. */
  end_time?: string;
  /** DashScope task error message. */
  message?: string;
  /** Prompt actually used for generation after prompt extension. */
  orig_prompt?: string;
  /** Generated image records returned by image tasks. */
  results?: ProviderGeneratedMedia[];
  /** Execution start time formatted as `YYYY-MM-DD HH:mm:ss.SSS`. */
  scheduled_time?: string;
  /** Submission time formatted as `YYYY-MM-DD HH:mm:ss.SSS`. */
  submit_time?: string;
  /** DashScope asynchronous task identifier, valid for 24 hours. */
  task_id?: string;
  /** Task status. */
  task_status?: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'UNKNOWN';
  /** Generated video URL; returned only when the task succeeded and valid for 24 hours. */
  video_url?: string;
}
