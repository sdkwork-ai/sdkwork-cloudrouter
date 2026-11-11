use serde::{Deserialize, Serialize};

use crate::models::{LumaKeyframe};

/// Luma first and last keyframes.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct LumaKeyframes {
    /// First frame.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub frame0: Option<LumaKeyframe>,

    /// Last frame.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub frame1: Option<LumaKeyframe>,
}
