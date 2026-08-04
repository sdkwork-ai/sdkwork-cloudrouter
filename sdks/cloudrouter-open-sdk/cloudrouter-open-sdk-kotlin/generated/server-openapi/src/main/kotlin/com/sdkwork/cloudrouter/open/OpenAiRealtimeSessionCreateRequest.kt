package com.sdkwork.cloudrouter.open

data class OpenAiRealtimeSessionCreateRequest(
    val instructions: String? = null,
    val metadata: Map<String, String>? = null,
    val modalities: List<String>? = null,
    val model: String? = null,
    val voice: String? = null
)
