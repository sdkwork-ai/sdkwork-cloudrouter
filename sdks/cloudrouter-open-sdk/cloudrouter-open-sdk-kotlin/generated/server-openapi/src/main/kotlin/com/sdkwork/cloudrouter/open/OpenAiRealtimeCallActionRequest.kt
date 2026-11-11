package com.sdkwork.cloudrouter.open

data class OpenAiRealtimeCallActionRequest(
    val audio: Map<String, String>? = null,
    val include: List<String>? = null,
    val instructions: String? = null,
    val maxOutputTokens: Int? = null,
    val model: String? = null,
    val outputModalities: List<String>? = null,
    val parallelToolCalls: Boolean? = null,
    val prompt: Map<String, String>? = null,
    val reasoning: Map<String, String>? = null,
    val toolChoice: String? = null,
    val tools: List<Map<String, String>>? = null,
    val tracing: Map<String, String>? = null,
    val truncation: Map<String, String>? = null,
    val type: String? = null
)
