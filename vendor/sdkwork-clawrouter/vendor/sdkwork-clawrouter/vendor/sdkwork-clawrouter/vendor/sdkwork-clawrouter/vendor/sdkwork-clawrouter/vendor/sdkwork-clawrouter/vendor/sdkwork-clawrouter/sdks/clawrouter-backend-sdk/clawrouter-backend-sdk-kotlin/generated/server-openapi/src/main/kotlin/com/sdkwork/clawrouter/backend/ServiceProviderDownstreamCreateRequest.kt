package com.sdkwork.clawrouter.backend

data class ServiceProviderDownstreamCreateRequest(
    val defaultCurrency: String? = null,
    val defaultMultiplier: String? = null,
    val displayName: String? = null,
    val pricePlanCode: String? = null,
    val providerNo: String? = null,
    val providerType: String? = null,
    val sellerProviderId: String? = null,
    val settlementMode: String? = null
)
