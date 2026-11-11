import type { ProviderJsonValue } from './provider-json-value';
import type { XaiGeneratedImage } from './xai-generated-image';
import type { XaiUsage } from './xai-usage';

/** xAI deferred-image poll result: HTTP 202 while pending, 200 with data when done, or a body error when failed. */
export interface XaiDeferredImageResponse {
  /** The generated images; present when done. */
  data?: XaiGeneratedImage[];
  /** Failure body returned when status is failed. */
  error?: Record<string, ProviderJsonValue>;
  /** The polled request id. */
  request_id: string;
  /** Deferred image status. */
  status: 'pending' | 'done' | 'failed';
  /** Usage field on the xai deferred image response, using the xai usage module. */
  usage?: XaiUsage;
}
