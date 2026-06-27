package com.sdkwork.clawrouter.backend

data class ServiceProviderPricingRuleUpdateRequest(
    val minimumCharge: String? = null,
    val priority: Int? = null,
    val status: String? = null,
    val unitPrice: String? = null,
    val unitSize: String? = null
)
