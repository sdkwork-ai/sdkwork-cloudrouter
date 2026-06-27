use serde::{Deserialize, Serialize};

/// Admin runtime region settings response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminRuntimeRegionSettingsResponse {
    /// Lowercase runtime region code. The default value is cn.
    #[serde(rename = "currentRegionCode")]
    pub current_region_code: String,

    /// Human-readable runtime region name displayed in admin operations.
    #[serde(rename = "currentRegionName")]
    pub current_region_name: String,

    /// Operator-facing explanation for how this runtime region is used.
    pub remark: String,
}
