package com.sdkwork.clawrouter.backend

data class StorageBucketConfig(
    val blockPublicAccess: Boolean? = null,
    val bucketName: String? = null,
    val bucketRegion: String? = null,
    val createdAt: String? = null,
    val defaultEncryptionMode: String? = null,
    val defaultStorageClass: String? = null,
    val encryption: String? = null,
    val id: String? = null,
    val kmsKeyRef: String? = null,
    val lifecycleEnabled: Boolean? = null,
    val logicalScope: String? = null,
    val objectKeyPrefix: String? = null,
    val objectLockEnabled: Boolean? = null,
    val providerCode: String? = null,
    val providerId: String? = null,
    val publicAccessBlocked: Boolean? = null,
    val status: String? = null,
    val storageClass: String? = null,
    val updatedAt: String? = null,
    val versioningEnabled: Boolean? = null
)
