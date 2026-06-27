package com.sdkwork.clawrouter.backend

data class MessagingRouteSimulationRequest(
    val channel: String? = null,
    val countryCode: String? = null,
    val deliveryPurpose: String? = null,
    val locale: String? = null,
    val sceneCode: String? = null,
    val userSegment: String? = null
)
