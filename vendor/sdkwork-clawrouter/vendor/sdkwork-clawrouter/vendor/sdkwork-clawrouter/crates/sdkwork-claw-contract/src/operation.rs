use serde::{Deserialize, Serialize};

use crate::ApiSurface;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ContractOperation {
    #[serde(rename = "operation")]
    pub operation: String,
    #[serde(rename = "api_method")]
    pub method: String,
    #[serde(rename = "api_path")]
    pub path: String,
    #[serde(rename = "api_surface")]
    pub surface: ApiSurface,
    #[serde(rename = "sdk_domain", default)]
    pub sdk_domain: Option<String>,
}
