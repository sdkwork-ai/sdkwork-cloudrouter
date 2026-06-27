package com.sdkwork.clawrouter.backend

data class AdminChannelUpdateRequest(
    val accessType: String? = null,
    val capabilities: List<String>? = null,
    val channelType: String? = null,
    val circuitBreakerPolicy: ProviderCircuitBreakerPolicy? = null,
    val credentialRotation: String? = null,
    val credentials: List<AdminChannelCredentialInput>? = null,
    val expiresAt: String? = null,
    val id: String? = null,
    val name: String? = null,
    val protocol: String? = null,
    val resourceCodes: List<String>? = null,
    val retryPolicy: ProviderRetryPolicy? = null,
    val status: String? = null,
    val timeoutMs: String? = null,
    val vendor: String? = null,
    val weight: String? = null
)
