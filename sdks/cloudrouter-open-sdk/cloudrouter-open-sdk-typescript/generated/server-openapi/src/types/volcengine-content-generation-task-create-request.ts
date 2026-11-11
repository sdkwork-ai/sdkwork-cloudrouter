import type { ArkWebSearchTool } from './ark-web-search-tool';
import type { ProviderJsonValue } from './provider-json-value';
import type { VolcengineContentPart } from './volcengine-content-part';

/** Volcengine Ark video generation task creation request (`POST /api/v3/contents/generations/tasks`). */
export interface VolcengineContentGenerationTaskCreateRequest {
  /** Callback URL that receives a POST request with the same body as the task query response whenever the task state changes. */
  callback_url?: string;
  /** When true the vendor appends a fixed-camera instruction to the prompt. Not supported for reference-image tasks. */
  camera_fixed?: boolean;
  /** Ordered input content parts: a text prompt plus optional images, videos, audio, or a draft task id. */
  content: VolcengineContentPart[];
  /** When true the task runs in draft mode and only produces a 480p preview video for review. */
  draft?: boolean;
  /** Output duration in whole seconds. `-1` lets the model choose within the model range. Model ranges: Seedance 2.5 [4, 30], Seedance 2.0 [4, 15], Seedance 1.0 pro [2, 12]. Mutually exclusive with `frames`; `frames` wins when both are sent. */
  duration?: number;
  /** Task timeout in seconds in [3600, 259200], counted from `created_at`; an unfinished task is marked `expired`. */
  execution_expires_after?: number;
  /** Output frame count, which allows fractional-second durations (frames = seconds x 24). Every integer in [29, 289] that satisfies 25 + 4n is accepted. Only Seedance 1.0 pro and 1.0 pro fast support this field; `frames` wins over `duration`. */
  frames?: number;
  /** When true the generated video carries audio synchronized with the picture. */
  generate_audio?: boolean;
  /** Volcengine Ark video model id or endpoint id, for example doubao-seedance-2-5-260628. */
  model: string;
  /** Omni-reference task type guidance. `auto` lets the model decide; `reference` generates from reference media; `edit` requires at least one reference video, ratio `adaptive`, and duration `-1`; `extend` requires at least one reference video and ratio `adaptive`. */
  omni_reference_task_type?: 'auto' | 'reference' | 'edit' | 'extend';
  /** Container format of the generated video; `mov` keeps a higher color precision for post-production. */
  output_format?: 'mp4' | 'mov';
  /** Queue priority in [0, 9]; a higher value jumps ahead of lower-priority tasks on the same endpoint. Not supported with `service_tier=flex`. */
  priority?: number;
  /** Output aspect ratio; `adaptive` follows the task type and the input media. */
  ratio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | 'adaptive';
  /** Output resolution tier. The allowed tiers depend on the selected model. */
  resolution?: '480p' | '720p' | '1080p' | '4k';
  /** When true the poll response also carries the last frame image URL (`content.last_frame_url`). */
  return_last_frame?: boolean;
  /** Stable unique identifier for the end user, at most 64 characters, used by the vendor for usage-policy detection. */
  safety_identifier?: string;
  /** Random seed in [-1, 2147483647]; `-1` uses a random seed. */
  seed?: number;
  /** Service tier: `default` online inference or `flex` offline inference at a lower price. Seedance 2.5 and 2.0 do not support `flex`. */
  service_tier?: 'default' | 'flex';
  /** Tools the model may call while generating the video. */
  tools?: ArkWebSearchTool[];
  /** When true the vendor adds its AI-generated watermark to the video. */
  watermark?: boolean;
}
