use serde::{Deserialize, Serialize};

/// Admin runtime region settings update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminRuntimeRegionSettingsUpdateRequest {
    /// Lowercase runtime region code, for example cn, us, eu, or global.
    #[serde(rename = "currentRegionCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub current_region_code: Option<String>,

    /// Human-readable runtime region name displayed in admin operations.
    #[serde(rename = "currentRegionName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub current_region_name: Option<String>,

    /// Operator-facing explanation for how this runtime region is used.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub remark: Option<String>,
}
