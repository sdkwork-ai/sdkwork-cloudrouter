use serde::{Deserialize, Serialize};

use crate::models::{ArkVideoTaskContent, ArkVideoUsage, ArkWebSearchTool, ProviderTaskError};

/// Volcengine Ark video generation task state returned by the query endpoint.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct VolcengineContentGenerationTask {
    /// Output content produced by the task. Only present once the task succeeds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<ArkVideoTaskContent>,

    /// Task creation time as a Unix timestamp in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Whether the output is a draft (preview) video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub draft: Option<bool>,

    /// Output duration in whole seconds; returned instead of `frames` when the request did not set `frames`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// Failure details. Null on success; populated with `code` and `message` on failure.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<ProviderTaskError>,

    /// Task timeout threshold in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub execution_expires_after: Option<i64>,

    /// Output frame count; returned instead of `duration` when the request set `frames`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub frames: Option<i64>,

    /// Output frame rate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub framespersecond: Option<i64>,

    /// Whether the output video carries synchronized audio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub generate_audio: Option<bool>,

    /// Volcengine Ark task id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Model name and version that served the task.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Actual container format of the generated video (`mp4` or `mov`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,

    /// Priority the task was submitted with.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<i64>,

    /// Output aspect ratio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ratio: Option<String>,

    /// Output resolution tier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution: Option<String>,

    /// End-user identifier echoed from the create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub safety_identifier: Option<String>,

    /// Seed value used by the request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Service tier that processed the task.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub service_tier: Option<String>,

    /// Task status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Tools the model actually used; omitted when no tool was used.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<ArkWebSearchTool>>,

    /// Last task status change as a Unix timestamp in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<i64>,

    /// Token usage of the request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<ArkVideoUsage>,
}
