package com.sdkwork.clawrouter.open

data class OpenAiRealtimeSession(
    val clientSecret: OpenAiRealtimeClientSecretValue? = null,
    val id: String? = null,
    val instructions: String? = null,
    val modalities: List<String>? = null,
    val model: String? = null,
    val object_: String? = null,
    val voice: String? = null
)
