import type { ProviderJsonValue } from './provider-json-value';

/** Kling sound-effect task (text-to-audio / video-to-audio) and its status. */
export interface KlingAudioTask {
  /** Kling business status code; 0 means accepted. */
  code?: number;
  /** Task envelope: task_id, task_status, task_status_msg, task_info, created_at, updated_at. */
  data?: Record<string, ProviderJsonValue>;
  /** Kling status message. */
  message?: string;
  /** Kling request identifier. */
  request_id?: string;
}
