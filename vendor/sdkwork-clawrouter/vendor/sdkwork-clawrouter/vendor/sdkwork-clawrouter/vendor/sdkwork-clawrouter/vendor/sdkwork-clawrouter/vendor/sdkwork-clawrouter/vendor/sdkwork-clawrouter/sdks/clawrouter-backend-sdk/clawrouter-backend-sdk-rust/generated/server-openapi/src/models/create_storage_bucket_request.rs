use serde::{Deserialize, Serialize};

/// Create storage bucket request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreateStorageBucketRequest {
    /// Block public access field on create storage bucket request.
    #[serde(rename = "blockPublicAccess")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub block_public_access: Option<bool>,

    /// Bucket name field on create storage bucket request.
    #[serde(rename = "bucketName")]
    pub bucket_name: String,

    /// Bucket region field on create storage bucket request.
    #[serde(rename = "bucketRegion")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bucket_region: Option<String>,

    /// Data residency region field on create storage bucket request.
    #[serde(rename = "dataResidencyRegion")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data_residency_region: Option<String>,

    /// Default encryption mode field on create storage bucket request.
    #[serde(rename = "defaultEncryptionMode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_encryption_mode: Option<String>,

    /// Default storage class field on create storage bucket request.
    #[serde(rename = "defaultStorageClass")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_storage_class: Option<String>,

    /// Encryption field on create storage bucket request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub encryption: Option<String>,

    /// Kms key ref field on create storage bucket request.
    #[serde(rename = "kmsKeyRef")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kms_key_ref: Option<String>,

    /// Lifecycle enabled field on create storage bucket request.
    #[serde(rename = "lifecycleEnabled")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lifecycle_enabled: Option<bool>,

    /// Logical scope field on create storage bucket request.
    #[serde(rename = "logicalScope")]
    pub logical_scope: String,

    /// Object key prefix field on create storage bucket request.
    #[serde(rename = "objectKeyPrefix")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object_key_prefix: Option<String>,

    /// Object lock enabled field on create storage bucket request.
    #[serde(rename = "objectLockEnabled")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object_lock_enabled: Option<bool>,

    /// Provider id field on create storage bucket request.
    #[serde(rename = "providerId")]
    pub provider_id: String,

    /// Public access blocked field on create storage bucket request.
    #[serde(rename = "publicAccessBlocked")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub public_access_blocked: Option<bool>,

    /// Storage class field on create storage bucket request.
    #[serde(rename = "storageClass")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub storage_class: Option<String>,

    /// Versioning enabled field on create storage bucket request.
    #[serde(rename = "versioningEnabled")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub versioning_enabled: Option<bool>,
}
