use serde::{Deserialize, Serialize};

/// Storage default bucket config schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageDefaultBucketConfig {
    /// Bucket id field on storage default bucket config.
    #[serde(rename = "bucketId")]
    pub bucket_id: String,

    /// Bucket name field on storage default bucket config.
    #[serde(rename = "bucketName")]
    pub bucket_name: String,

    /// Data residency region field on storage default bucket config.
    #[serde(rename = "dataResidencyRegion")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data_residency_region: Option<String>,

    /// Id field on storage default bucket config.
    pub id: String,

    /// Logical scope field on storage default bucket config.
    #[serde(rename = "logicalScope")]
    pub logical_scope: String,

    /// Provider code field on storage default bucket config.
    #[serde(rename = "providerCode")]
    pub provider_code: String,

    /// Provider id field on storage default bucket config.
    #[serde(rename = "providerId")]
    pub provider_id: String,

    /// Provider type field on storage default bucket config.
    #[serde(rename = "providerType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_type: Option<String>,

    /// Reason field on storage default bucket config.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,

    /// Region field on storage default bucket config.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub region: Option<String>,

    /// Status field on storage default bucket config.
    pub status: String,

    /// Updated at field on storage default bucket config.
    #[serde(rename = "updatedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}
