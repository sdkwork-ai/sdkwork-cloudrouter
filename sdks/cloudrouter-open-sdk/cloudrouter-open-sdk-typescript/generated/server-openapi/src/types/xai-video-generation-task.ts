import type { ProviderJsonValue } from './provider-json-value';
import type { XaiUsage } from './xai-usage';
import type { XaiVideoUrl } from './xai-video-url';

/** xAI video task result (VideoResponse): poll GET /xai/v1/videos/{request_id}. */
export interface XaiVideoGenerationTask {
  /** Failure body returned when the task failed. */
  error?: Record<string, ProviderJsonValue>;
  /** The model used to generate the video; omitted when status is failed. */
  model?: string;
  /** Approximate completion percentage (0-100). */
  progress?: number;
  /** The polled request id. */
  request_id?: string;
  /** Status of the video generation: done when the video is ready. */
  status: string;
  /** Usage field on the xai video generation task, using the xai usage module. */
  usage?: XaiUsage;
  /** Video field on the xai video generation task, using the xai video url module. */
  video?: XaiVideoUrl;
}
