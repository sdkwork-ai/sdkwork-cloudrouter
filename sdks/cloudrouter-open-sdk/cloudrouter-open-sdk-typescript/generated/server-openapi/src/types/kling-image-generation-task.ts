import type { KlingImageTaskData } from './kling-image-task-data';
import type { ProviderJsonValue } from './provider-json-value';

/** Kling image task envelope returned by the create and query endpoints. */
export interface KlingImageGenerationTask {
  /** Kling business status code; 0 means success. */
  code?: number;
  /** Task record. */
  data?: KlingImageTaskData;
  /** Kling status message. */
  message?: string;
  /** Kling request identifier. */
  request_id?: string;
}
