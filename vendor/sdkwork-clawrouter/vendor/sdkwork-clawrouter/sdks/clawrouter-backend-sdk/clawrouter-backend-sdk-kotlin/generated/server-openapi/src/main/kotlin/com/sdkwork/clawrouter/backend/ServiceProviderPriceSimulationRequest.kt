package com.sdkwork.clawrouter.backend

data class ServiceProviderPriceSimulationRequest(
    val billingMeterCode: String? = null,
    val buyerProviderId: String? = null,
    val catalogKey: String? = null,
    val model: String? = null,
    val quantity: String? = null,
    val tokenKind: String? = null
)
