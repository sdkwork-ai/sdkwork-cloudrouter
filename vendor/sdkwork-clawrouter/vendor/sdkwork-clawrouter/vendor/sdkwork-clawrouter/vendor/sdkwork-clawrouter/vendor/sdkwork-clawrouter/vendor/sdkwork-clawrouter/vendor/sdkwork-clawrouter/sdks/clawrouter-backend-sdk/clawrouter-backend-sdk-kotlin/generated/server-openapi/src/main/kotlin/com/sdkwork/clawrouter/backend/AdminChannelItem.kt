package com.sdkwork.clawrouter.backend

data class AdminChannelItem(
    val accessType: String? = null,
    val balance: String? = null,
    val capabilities: List<String>? = null,
    val channelId: String? = null,
    val channelType: String? = null,
    val circuitBreakerPolicy: ProviderCircuitBreakerPolicy? = null,
    val createdAt: String? = null,
    val credentialRotation: String? = null,
    val credentials: List<AdminChannelCredentialItem>? = null,
    val errors: String? = null,
    val expiresAt: String? = null,
    val id: String? = null,
    val isMultimodal: Boolean? = null,
    val name: String? = null,
    val protocol: String? = null,
    val resourceCodes: List<String>? = null,
    val retryPolicy: ProviderRetryPolicy? = null,
    val status: String? = null,
    val timeoutMs: String? = null,
    val vendor: String? = null,
    val weight: String? = null
)
