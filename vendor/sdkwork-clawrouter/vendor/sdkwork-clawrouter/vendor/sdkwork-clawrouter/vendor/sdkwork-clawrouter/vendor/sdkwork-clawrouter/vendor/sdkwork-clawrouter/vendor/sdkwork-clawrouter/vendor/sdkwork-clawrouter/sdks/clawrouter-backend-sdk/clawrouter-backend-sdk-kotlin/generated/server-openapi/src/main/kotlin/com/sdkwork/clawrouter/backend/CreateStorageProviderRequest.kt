package com.sdkwork.clawrouter.backend

data class CreateStorageProviderRequest(
    val credentialRef: String? = null,
    val endpoint: String? = null,
    val endpointUrl: String? = null,
    val lifecycle: Boolean? = null,
    val multipart: Boolean? = null,
    val objectLock: Boolean? = null,
    val pathStyleEnabled: Boolean? = null,
    val providerCode: String? = null,
    val providerType: String? = null,
    val region: String? = null,
    val supportsLifecycle: Boolean? = null,
    val supportsMultipart: Boolean? = null,
    val supportsObjectLock: Boolean? = null
)
