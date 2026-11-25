package com.sdkwork.cloudrouter.open

data class OpenAiRealtimeSession(
    val clientSecret: OpenAiRealtimeClientSecretValue? = null,
    val id: String,
    val instructions: String? = null,
    val modalities: List<String>? = null,
    val model: String? = null,
    val object_: String,
    val voice: String? = null
)
