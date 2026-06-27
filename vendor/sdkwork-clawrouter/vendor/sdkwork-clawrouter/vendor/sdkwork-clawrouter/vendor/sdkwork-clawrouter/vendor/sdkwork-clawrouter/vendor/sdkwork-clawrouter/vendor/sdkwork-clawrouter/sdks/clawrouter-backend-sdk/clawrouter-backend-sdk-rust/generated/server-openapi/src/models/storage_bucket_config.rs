use serde::{Deserialize, Serialize};

/// Storage bucket config schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageBucketConfig {
    /// Block public access field on storage bucket config.
    #[serde(rename = "blockPublicAccess")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub block_public_access: Option<bool>,

    /// Bucket name field on storage bucket config.
    #[serde(rename = "bucketName")]
    pub bucket_name: String,

    /// Bucket region field on storage bucket config.
    #[serde(rename = "bucketRegion")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bucket_region: Option<String>,

    /// Created at field on storage bucket config.
    #[serde(rename = "createdAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Default encryption mode field on storage bucket config.
    #[serde(rename = "defaultEncryptionMode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_encryption_mode: Option<String>,

    /// Default storage class field on storage bucket config.
    #[serde(rename = "defaultStorageClass")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_storage_class: Option<String>,

    /// Encryption field on storage bucket config.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub encryption: Option<String>,

    /// Id field on storage bucket config.
    pub id: String,

    /// Kms key ref field on storage bucket config.
    #[serde(rename = "kmsKeyRef")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kms_key_ref: Option<String>,

    /// Lifecycle enabled field on storage bucket config.
    #[serde(rename = "lifecycleEnabled")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lifecycle_enabled: Option<bool>,

    /// Logical scope field on storage bucket config.
    #[serde(rename = "logicalScope")]
    pub logical_scope: String,

    /// Object key prefix field on storage bucket config.
    #[serde(rename = "objectKeyPrefix")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object_key_prefix: Option<String>,

    /// Object lock enabled field on storage bucket config.
    #[serde(rename = "objectLockEnabled")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object_lock_enabled: Option<bool>,

    /// Provider code field on storage bucket config.
    #[serde(rename = "providerCode")]
    pub provider_code: String,

    /// Provider id field on storage bucket config.
    #[serde(rename = "providerId")]
    pub provider_id: String,

    /// Public access blocked field on storage bucket config.
    #[serde(rename = "publicAccessBlocked")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub public_access_blocked: Option<bool>,

    /// Status field on storage bucket config.
    pub status: String,

    /// Storage class field on storage bucket config.
    #[serde(rename = "storageClass")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub storage_class: Option<String>,

    /// Updated at field on storage bucket config.
    #[serde(rename = "updatedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,

    /// Versioning enabled field on storage bucket config.
    #[serde(rename = "versioningEnabled")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub versioning_enabled: Option<bool>,
}
