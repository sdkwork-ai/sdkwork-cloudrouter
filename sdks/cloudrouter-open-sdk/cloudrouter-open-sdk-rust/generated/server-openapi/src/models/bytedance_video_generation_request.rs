use serde::{Deserialize, Serialize};

use crate::models::{ArkContentPart, ArkWebSearchTool};

/// ByteDance Ark Seedance video generation task request; the vendor serves the official `/api/v3/contents/generations/tasks` contract.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct BytedanceVideoGenerationRequest {
    /// Callback URL that receives a POST request with the same body as the task query response whenever the task state changes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// When true the vendor appends a fixed-camera instruction to the prompt. Not supported for reference-image tasks.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub camera_fixed: Option<bool>,

    /// Ordered input content parts: a text prompt plus optional images, videos, audio, or a draft task id.
    pub content: Vec<ArkContentPart>,

    /// When true the task runs in draft mode and only produces a 480p preview video for review.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub draft: Option<bool>,

    /// Output duration in whole seconds. `-1` lets the model choose within the model range. Model ranges: Seedance 2.5 [4, 30], Seedance 2.0 [4, 15], Seedance 1.0 pro [2, 12]. Mutually exclusive with `frames`; `frames` wins when both are sent.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// Task timeout in seconds in [3600, 259200], counted from `created_at`; an unfinished task is marked `expired`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub execution_expires_after: Option<i64>,

    /// Output frame count, which allows fractional-second durations (frames = seconds x 24). Every integer in [29, 289] that satisfies 25 + 4n is accepted. Only Seedance 1.0 pro and 1.0 pro fast support this field; `frames` wins over `duration`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub frames: Option<i64>,

    /// When true the generated video carries audio synchronized with the picture.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub generate_audio: Option<bool>,

    /// ByteDance Ark Seedance video model id or endpoint id, for example doubao-seedance-2-5-260628.
    pub model: String,

    /// Omni-reference task type guidance. `auto` lets the model decide; `reference` generates from reference media; `edit` requires at least one reference video, ratio `adaptive`, and duration `-1`; `extend` requires at least one reference video and ratio `adaptive`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub omni_reference_task_type: Option<String>,

    /// Container format of the generated video; `mov` keeps a higher color precision for post-production.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,

    /// Queue priority in [0, 9]; a higher value jumps ahead of lower-priority tasks on the same endpoint. Not supported with `service_tier=flex`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<i64>,

    /// Output aspect ratio; `adaptive` follows the task type and the input media.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ratio: Option<String>,

    /// Output resolution tier. The allowed tiers depend on the selected model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution: Option<String>,

    /// When true the poll response also carries the last frame image URL (`content.last_frame_url`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub return_last_frame: Option<bool>,

    /// Stable unique identifier for the end user, at most 64 characters, used by the vendor for usage-policy detection.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub safety_identifier: Option<String>,

    /// Random seed in [-1, 2147483647]; `-1` uses a random seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Service tier: `default` online inference or `flex` offline inference at a lower price. Seedance 2.5 and 2.0 do not support `flex`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub service_tier: Option<String>,

    /// Tools the model may call while generating the video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<ArkWebSearchTool>>,

    /// When true the vendor adds its AI-generated watermark to the video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub watermark: Option<bool>,
}
