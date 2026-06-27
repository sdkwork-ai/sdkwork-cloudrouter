use serde::{Deserialize, Serialize};

/// Admin ai resource group resource item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiResourceGroupResourceItem {
    /// Api endpoint code field on admin ai resource group resource item.
    #[serde(rename = "apiEndpointCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api_endpoint_code: Option<String>,

    /// Catalog key field on admin ai resource group resource item.
    #[serde(rename = "catalogKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub catalog_key: Option<String>,

    /// Display name field on admin ai resource group resource item.
    #[serde(rename = "displayName")]
    pub display_name: String,

    /// Id field on admin ai resource group resource item.
    pub id: String,

    /// Member role field on admin ai resource group resource item.
    #[serde(rename = "memberRole")]
    pub member_role: String,

    /// Modality code field on admin ai resource group resource item.
    #[serde(rename = "modalityCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modality_code: Option<String>,

    /// Model field on admin ai resource group resource item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Provider native model field on admin ai resource group resource item.
    #[serde(rename = "providerNativeModel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_native_model: Option<String>,

    /// Resource code field on admin ai resource group resource item.
    #[serde(rename = "resourceCode")]
    pub resource_code: String,

    /// Resource type field on admin ai resource group resource item.
    #[serde(rename = "resourceType")]
    pub resource_type: String,

    /// Sort order field on admin ai resource group resource item.
    #[serde(rename = "sortOrder")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<String>,

    /// Status field on admin ai resource group resource item.
    pub status: String,

    /// Vendor code field on admin ai resource group resource item.
    #[serde(rename = "vendorCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vendor_code: Option<String>,
}
