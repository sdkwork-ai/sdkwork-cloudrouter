package com.sdkwork.clawrouter.backend

data class AdminProviderSecretCreateRequest(
    val authType: String? = null,
    val name: String? = null,
    val providerCode: String? = null,
    val secretRef: String? = null,
    val status: String? = null
)
