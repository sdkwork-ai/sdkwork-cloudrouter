package com.sdkwork.cloudrouter.open

data class OpenAiRealtimeClientSecretCreateRequest(
    val instructions: String? = null,
    val metadata: Map<String, String>? = null,
    val modalities: List<String>? = null,
    val model: String? = null,
    val voice: String? = null
)
