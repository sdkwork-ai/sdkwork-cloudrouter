import type { ArkVideoTaskContent } from './ark-video-task-content';
import type { ArkVideoUsage } from './ark-video-usage';
import type { ArkWebSearchTool } from './ark-web-search-tool';
import type { ProviderJsonValue } from './provider-json-value';
import type { ProviderTaskError } from './provider-task-error';

/** ByteDance Ark content generation task and its generated video. */
export interface BytedanceVideoGenerationTask {
  /** Output content produced by the task. Only present once the task succeeds. */
  content?: ArkVideoTaskContent;
  /** Task creation time as a Unix timestamp in seconds. */
  created_at?: number;
  /** Whether the output is a draft (preview) video. */
  draft?: boolean;
  /** Output duration in whole seconds; returned instead of `frames` when the request did not set `frames`. */
  duration?: number;
  /** Failure details. Null on success; populated with `code` and `message` on failure. */
  error?: ProviderTaskError;
  /** Task timeout threshold in seconds. */
  execution_expires_after?: number;
  /** Output frame count; returned instead of `duration` when the request set `frames`. */
  frames?: number;
  /** Output frame rate. */
  framespersecond?: number;
  /** Whether the output video carries synchronized audio. */
  generate_audio?: boolean;
  /** ByteDance Ark Seedance task id. */
  id?: string;
  /** Model name and version that served the task. */
  model?: string;
  /** Actual container format of the generated video (`mp4` or `mov`). */
  output_format?: string;
  /** Priority the task was submitted with. */
  priority?: number;
  /** Output aspect ratio. */
  ratio?: string;
  /** Output resolution tier. */
  resolution?: string;
  /** End-user identifier echoed from the create request. */
  safety_identifier?: string;
  /** Seed value used by the request. */
  seed?: number;
  /** Service tier that processed the task. */
  service_tier?: string;
  /** Task status. */
  status?: 'queued' | 'running' | 'cancelled' | 'succeeded' | 'failed' | 'expired';
  /** Tools the model actually used; omitted when no tool was used. */
  tools?: ArkWebSearchTool[];
  /** Last task status change as a Unix timestamp in seconds. */
  updated_at?: number;
  /** Token usage of the request. */
  usage?: ArkVideoUsage;
}
