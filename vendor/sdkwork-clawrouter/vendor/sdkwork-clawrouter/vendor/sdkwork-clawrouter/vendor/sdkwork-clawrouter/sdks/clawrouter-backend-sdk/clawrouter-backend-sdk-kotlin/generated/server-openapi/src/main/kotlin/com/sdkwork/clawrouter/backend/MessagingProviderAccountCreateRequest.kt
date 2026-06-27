package com.sdkwork.clawrouter.backend

data class MessagingProviderAccountCreateRequest(
    val accountCode: String? = null,
    val accountName: String? = null,
    val baseUrl: String? = null,
    val capabilitySchema: Map<String, String>? = null,
    val channel: String? = null,
    val credential: Map<String, Any>? = null,
    val deliveryPurpose: String? = null,
    val providerCode: String? = null
)
