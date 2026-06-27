package com.sdkwork.clawrouter.app

data class RuntimeEventCreateRequest(
    val eventSource: String? = null,
    val eventType: String? = null,
    val metadata: Map<String, String>? = null,
    val payloadJson: Map<String, String>? = null,
    val textDelta: String? = null
)
