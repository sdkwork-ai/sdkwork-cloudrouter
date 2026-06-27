package com.sdkwork.clawrouter.backend

data class AdminProviderSecretUpdateRequest(
    val authType: String? = null,
    val id: String? = null,
    val name: String? = null,
    val providerCode: String? = null,
    val secretRef: String? = null,
    val status: String? = null
)
