package com.sdkwork.clawrouter.app

data class RuntimeEventItem(
    val createdAt: String? = null,
    val eventNo: String? = null,
    val eventSource: String? = null,
    val eventType: String? = null,
    val id: String? = null,
    val invocationId: String? = null,
    val payloadJson: Map<String, String>? = null,
    val textDelta: String? = null
)
