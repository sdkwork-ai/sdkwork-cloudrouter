//! Read models shared by the model → account-group surfaces.
//!
//! These are plain data: the open-api, app-api, and the console contract all
//! project the same membership answer, so the shape lives in the domain plane
//! instead of being re-declared per API surface.

use serde::{Deserialize, Serialize};

/// One selectable account group for a model.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelGroupOption {
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub group_id: i64,
    pub group_code: String,
    pub group_name: String,
    pub is_default: bool,
    /// Set when this group is the caller's effective default for the model.
    pub selected: bool,
}

/// One model row of the console catalog.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelGroupCatalogModel {
    pub model: String,
    pub catalog_key: String,
    pub display_name: String,
    pub vendor_code: String,
    /// Catalog modality vocabulary (`text`/`image`/...).
    pub modalities: Vec<String>,
    pub groups: Vec<ModelGroupOption>,
    /// Configured default groups in failover order (user rules win over the
    /// account-level default). Empty means "use the account default".
    #[serde(default)]
    pub default_group_codes: Vec<String>,
    /// `user-model-default`, `user-vendor-default`, `user-modality-default`,
    /// `modality-default`, `mixed-default`, `is_default`,
    /// `default-group-code`, or `single-group-in-scope`.
    pub default_source: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelGroupCatalogVendor {
    pub vendor_code: String,
    pub vendor_name: String,
    pub models: Vec<ModelGroupCatalogModel>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelGroupCatalogModality {
    pub modality: String,
    pub vendors: Vec<ModelGroupCatalogVendor>,
}
