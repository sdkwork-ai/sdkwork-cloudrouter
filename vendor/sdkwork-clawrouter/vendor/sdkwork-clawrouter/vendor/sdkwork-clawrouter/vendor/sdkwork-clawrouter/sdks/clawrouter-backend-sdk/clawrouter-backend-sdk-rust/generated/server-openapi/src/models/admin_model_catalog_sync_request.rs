use serde::{Deserialize, Serialize};

/// Admin model catalog sync request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelCatalogSyncRequest {
    /// Optional sdkwork-models project root. Overrides SDKWORK_MODELS_CATALOG_ROOT for this sync.
    #[serde(rename = "catalogRoot")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub catalog_root: Option<String>,

    /// Optional catalogVersion pin; sync fails if the loaded catalog differs.
    #[serde(rename = "catalogVersion")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub catalog_version: Option<String>,

    /// Whether to force refresh even when the selected catalog version is already installed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub force: Option<bool>,

    /// Refresh mode. dry_run previews without mutating catalog tables.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,

    /// Optional catalog source label; defaults to sdkwork_models.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,

    /// Optional vendor directory codes to refresh.
    #[serde(rename = "vendorCodes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vendor_codes: Option<Vec<String>>,
}
