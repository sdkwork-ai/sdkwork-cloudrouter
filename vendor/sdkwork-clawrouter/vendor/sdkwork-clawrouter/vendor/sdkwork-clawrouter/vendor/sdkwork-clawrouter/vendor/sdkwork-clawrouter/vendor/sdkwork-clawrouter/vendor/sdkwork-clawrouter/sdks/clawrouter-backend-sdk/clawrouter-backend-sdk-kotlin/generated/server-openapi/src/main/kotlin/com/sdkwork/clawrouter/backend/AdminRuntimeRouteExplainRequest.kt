package com.sdkwork.clawrouter.backend

data class AdminRuntimeRouteExplainRequest(
    val apiCode: String? = null,
    val apiKeyId: String? = null,
    val billingMeter: String? = null,
    val capability: String? = null,
    val catalogKey: String? = null,
    val channelGroupId: String? = null,
    val model: String? = null,
    val resourceCode: String? = null,
    val routeKey: String? = null
)
