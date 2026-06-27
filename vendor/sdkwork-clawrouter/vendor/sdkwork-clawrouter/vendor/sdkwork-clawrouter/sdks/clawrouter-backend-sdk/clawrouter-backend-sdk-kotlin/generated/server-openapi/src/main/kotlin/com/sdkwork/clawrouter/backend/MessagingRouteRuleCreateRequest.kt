package com.sdkwork.clawrouter.backend

data class MessagingRouteRuleCreateRequest(
    val channel: String? = null,
    val countryCode: String? = null,
    val deliveryPurpose: String? = null,
    val failoverPolicy: Map<String, String>? = null,
    val locale: String? = null,
    val priority: Int? = null,
    val ruleCode: String? = null,
    val sceneCode: String? = null,
    val targets: List<Map<String, Any>>? = null,
    val userSegment: String? = null
)
