package com.sdkwork.clawrouter.backend

data class MessagingRouteSimulationResponse(
    val matched: Boolean? = null,
    val routeRuleId: String? = null,
    val targets: List<Map<String, String>>? = null
)
