package com.sdkwork.clawrouter.backend

data class ServiceProviderPricingRuleCreateRequest(
    val billingMeterCode: String? = null,
    val buyerProviderId: String? = null,
    val catalogKey: String? = null,
    val currency: String? = null,
    val edgeId: String? = null,
    val minimumCharge: String? = null,
    val model: String? = null,
    val pricePlanId: String? = null,
    val priority: Int? = null,
    val sellerProviderId: String? = null,
    val tokenKind: String? = null,
    val unitPrice: String? = null,
    val unitSize: String? = null
)
