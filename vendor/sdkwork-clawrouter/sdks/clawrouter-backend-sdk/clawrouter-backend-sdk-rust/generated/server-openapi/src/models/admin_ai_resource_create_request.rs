use serde::{Deserialize, Serialize};

use crate::models::{AdminAiResourceMemberInput};

/// Admin ai resource create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiResourceCreateRequest {
    /// Api endpoint code field on admin ai resource create request.
    #[serde(rename = "apiEndpointCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api_endpoint_code: Option<String>,

    /// Catalog key field on admin ai resource create request.
    #[serde(rename = "catalogKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub catalog_key: Option<String>,

    /// Composition mode field on admin ai resource create request.
    #[serde(rename = "compositionMode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub composition_mode: Option<String>,

    /// Display name field on admin ai resource create request.
    #[serde(rename = "displayName")]
    pub display_name: String,

    /// Members field on admin ai resource create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub members: Option<Vec<AdminAiResourceMemberInput>>,

    /// Modality code field on admin ai resource create request.
    #[serde(rename = "modalityCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modality_code: Option<String>,

    /// Model field on admin ai resource create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Provider native model field on admin ai resource create request.
    #[serde(rename = "providerNativeModel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_native_model: Option<String>,

    /// Stable normalized AI resource code.
    #[serde(rename = "resourceCode")]
    pub resource_code: String,

    /// Resource type field on admin ai resource create request.
    #[serde(rename = "resourceType")]
    pub resource_type: String,

    /// Sort order field on admin ai resource create request.
    #[serde(rename = "sortOrder")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<String>,

    /// Status field on admin ai resource create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Vendor code field on admin ai resource create request.
    #[serde(rename = "vendorCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vendor_code: Option<String>,
}
