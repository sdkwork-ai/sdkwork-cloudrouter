use serde::{Deserialize, Serialize};

use crate::models::{PixverseErrorDetail, PixverseTaskResp};

/// PixVerse generation submission acknowledgement.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct PixverseVideoGenerationResponse {
    /// PixVerse business result code; a nonzero code indicates failure even with HTTP 200.
    #[serde(rename = "ErrCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub err_code: Option<i64>,

    /// PixVerse response message.
    #[serde(rename = "ErrMsg")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub err_msg: Option<String>,

    /// Supplemental error details when available.
    #[serde(rename = "Error")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<PixverseErrorDetail>,

    /// Task payload.
    #[serde(rename = "Resp")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resp: Option<PixverseTaskResp>,
}
