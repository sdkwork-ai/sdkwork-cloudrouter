use serde::{Deserialize, Serialize};

/// Installation status response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct InstallationStatusResponse {
    /// Catalog source field on installation status response.
    #[serde(rename = "catalogSource")]
    pub catalog_source: String,

    /// Catalog version field on installation status response.
    #[serde(rename = "catalogVersion")]
    pub catalog_version: String,

    /// Always false for status reads; install and upgrade actions report changes through the installer command path.
    pub changed: bool,

    /// Environment field on installation status response.
    pub environment: String,

    /// External catalog field on installation status response.
    #[serde(rename = "externalCatalog")]
    pub external_catalog: bool,

    /// Last catalog refresh status field on installation status response.
    #[serde(rename = "lastCatalogRefreshStatus")]
    pub last_catalog_refresh_status: String,

    /// Schema version field on installation status response.
    #[serde(rename = "schemaVersion")]
    pub schema_version: String,

    /// Seed profile field on installation status response.
    #[serde(rename = "seedProfile")]
    pub seed_profile: String,

    /// Status field on installation status response.
    pub status: String,
}
