use serde::{Deserialize, Serialize};

use crate::models::{AdminAiResourceMemberItem};

/// Admin ai resource item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiResourceItem {
    /// Api endpoint code field on admin ai resource item.
    #[serde(rename = "apiEndpointCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api_endpoint_code: Option<String>,

    /// Capabilities field on admin ai resource item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub capabilities: Option<Vec<String>>,

    /// Capability field on admin ai resource item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub capability: Option<String>,

    /// Catalog key field on admin ai resource item.
    #[serde(rename = "catalogKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub catalog_key: Option<String>,

    /// Composition mode field on admin ai resource item.
    #[serde(rename = "compositionMode")]
    pub composition_mode: String,

    /// Display name field on admin ai resource item.
    #[serde(rename = "displayName")]
    pub display_name: String,

    /// Id field on admin ai resource item.
    pub id: String,

    /// Members field on admin ai resource item.
    pub members: Vec<AdminAiResourceMemberItem>,

    /// Modality code field on admin ai resource item.
    #[serde(rename = "modalityCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modality_code: Option<String>,

    /// Model field on admin ai resource item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Provider native model field on admin ai resource item.
    #[serde(rename = "providerNativeModel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_native_model: Option<String>,

    /// Resource code field on admin ai resource item.
    #[serde(rename = "resourceCode")]
    pub resource_code: String,

    /// Resource type field on admin ai resource item.
    #[serde(rename = "resourceType")]
    pub resource_type: String,

    /// Sort order field on admin ai resource item.
    #[serde(rename = "sortOrder")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<String>,

    /// Status field on admin ai resource item.
    pub status: String,

    /// Vendor code field on admin ai resource item.
    #[serde(rename = "vendorCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vendor_code: Option<String>,
}
