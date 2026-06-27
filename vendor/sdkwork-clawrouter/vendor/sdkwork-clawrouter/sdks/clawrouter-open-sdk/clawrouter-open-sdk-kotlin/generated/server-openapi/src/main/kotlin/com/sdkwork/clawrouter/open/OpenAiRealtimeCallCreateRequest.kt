package com.sdkwork.clawrouter.open

data class OpenAiRealtimeCallCreateRequest(
    val metadata: Map<String, String>? = null,
    val sdp: String? = null,
    val session: String? = null
)
