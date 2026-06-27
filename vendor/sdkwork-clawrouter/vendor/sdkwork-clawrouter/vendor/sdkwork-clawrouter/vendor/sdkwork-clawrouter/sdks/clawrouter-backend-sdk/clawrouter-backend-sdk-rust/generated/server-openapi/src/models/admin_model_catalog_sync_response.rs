use serde::{Deserialize, Serialize};

use crate::models::{AdminAiModelItem, AdminModelVendorItem};

/// Admin model catalog sync response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelCatalogSyncResponse {
    /// Total accepted standard fact count across meters, vendors, families, models, capabilities, prices, and rankings.
    #[serde(rename = "acceptedCount")]
    pub accepted_count: String,

    /// Generated model capability fact count considered by the sync.
    #[serde(rename = "capabilityCount")]
    pub capability_count: String,

    /// Catalog root field on admin model catalog sync response.
    #[serde(rename = "catalogRoot")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub catalog_root: Option<String>,

    /// sdkwork-models catalogVersion loaded for this sync.
    #[serde(rename = "catalogVersion")]
    pub catalog_version: String,

    /// Whether this response represents an observation-only sync that did not mutate model catalog facts.
    #[serde(rename = "dryRun")]
    pub dry_run: bool,

    /// Selected model family fact count considered by the sync.
    #[serde(rename = "familyCount")]
    pub family_count: String,

    /// Shared sdkwork-models billing meter fact count considered by the sync.
    #[serde(rename = "meterCount")]
    pub meter_count: String,

    /// Normalized sync mode executed by the backend.
    pub mode: String,

    /// Selected model definition fact count considered by the sync.
    #[serde(rename = "modelCount")]
    pub model_count: String,

    /// Current ai model snapshots after sync.
    pub models: Vec<AdminAiModelItem>,

    /// Expanded pricing fact count considered by the sync.
    #[serde(rename = "priceCount")]
    pub price_count: String,

    /// Selected ranking snapshot item count considered by the sync.
    #[serde(rename = "rankingCount")]
    pub ranking_count: String,

    /// Requested catalog version field on admin model catalog sync response.
    #[serde(rename = "requestedCatalogVersion")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub requested_catalog_version: Option<String>,

    /// Pricing import snapshot identifier created by the sync.
    #[serde(rename = "snapshotId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub snapshot_id: Option<String>,

    /// Normalized catalog source label used for the sync.
    pub source: String,

    /// Stable SHA-256 hash of the selected sdkwork-models catalog scope, independent of request id, time, or snapshot id.
    #[serde(rename = "sourceHash")]
    pub source_hash: String,

    /// Model catalog sync-run identifier created by the sync.
    #[serde(rename = "syncRunId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sync_run_id: Option<String>,

    /// Whether the catalog snapshot refresh completed.
    pub synced: bool,

    /// Actual vendor scope covered by the loaded catalog snapshot.
    #[serde(rename = "vendorCodes")]
    pub vendor_codes: Vec<String>,

    /// Selected vendor directory count considered by the sync.
    #[serde(rename = "vendorCount")]
    pub vendor_count: String,

    /// Current model vendor snapshots after sync.
    pub vendors: Vec<AdminModelVendorItem>,
}
