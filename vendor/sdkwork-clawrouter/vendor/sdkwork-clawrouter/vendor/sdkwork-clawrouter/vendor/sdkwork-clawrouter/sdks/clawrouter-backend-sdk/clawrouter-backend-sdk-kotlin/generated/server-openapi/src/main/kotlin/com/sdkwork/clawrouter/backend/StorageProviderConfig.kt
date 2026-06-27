package com.sdkwork.clawrouter.backend

data class StorageProviderConfig(
    val createdAt: String? = null,
    val credentialRef: String? = null,
    val endpoint: String? = null,
    val endpointUrl: String? = null,
    val health: String? = null,
    val healthStatus: String? = null,
    val id: String? = null,
    val lastHealthCheckAt: String? = null,
    val lifecycle: Boolean? = null,
    val multipart: Boolean? = null,
    val objectLock: Boolean? = null,
    val pathStyleEnabled: Boolean? = null,
    val providerCode: String? = null,
    val providerType: String? = null,
    val region: String? = null,
    val status: String? = null,
    val supportsLifecycle: Boolean? = null,
    val supportsMultipart: Boolean? = null,
    val supportsObjectLock: Boolean? = null,
    val updatedAt: String? = null
)
