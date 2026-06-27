package com.sdkwork.clawrouter.backend

data class CreateStorageBucketRequest(
    val blockPublicAccess: Boolean? = null,
    val bucketName: String? = null,
    val bucketRegion: String? = null,
    val dataResidencyRegion: String? = null,
    val defaultEncryptionMode: String? = null,
    val defaultStorageClass: String? = null,
    val encryption: String? = null,
    val kmsKeyRef: String? = null,
    val lifecycleEnabled: Boolean? = null,
    val logicalScope: String? = null,
    val objectKeyPrefix: String? = null,
    val objectLockEnabled: Boolean? = null,
    val providerId: String? = null,
    val publicAccessBlocked: Boolean? = null,
    val storageClass: String? = null,
    val versioningEnabled: Boolean? = null
)
