use serde::{Deserialize, Serialize};

use crate::models::{XaiGeneratedImage, XaiUsage};

/// xAI deferred-image poll result: HTTP 202 while pending, 200 with data when done, or a body error when failed.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct XaiDeferredImageResponse {
    /// The generated images; present when done.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<Vec<XaiGeneratedImage>>,

    /// Failure body returned when status is failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<std::collections::HashMap<String, String>>,

    /// The polled request id.
    pub request_id: String,

    /// Deferred image status.
    pub status: String,

    /// Usage field on the xai deferred image response, using the xai usage module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<XaiUsage>,
}
