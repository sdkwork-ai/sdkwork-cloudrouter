import type { ProviderJsonValue } from './provider-json-value';
import type { ZhipuImageResult } from './zhipu-image-result';
import type { ZhipuVideoResult } from './zhipu-video-result';

/** Zhipu asynchronous video/image generation result. */
export interface ZhipuVideoGenerationTask {
  /** Request creation time as a Unix timestamp in seconds. */
  created?: number;
  /** Asynchronous task id, present on the create response. */
  id?: string;
  /** Generated image outputs for asynchronous image tasks. */
  image_result?: ZhipuImageResult[];
  /** Model that served the task. */
  model?: string;
  /** Request id echoed back by the provider. */
  request_id?: string;
  /** Task status. */
  task_status?: 'PROCESSING' | 'SUCCESS' | 'FAIL';
  /** Generated video outputs. */
  video_result?: ZhipuVideoResult[];
}
