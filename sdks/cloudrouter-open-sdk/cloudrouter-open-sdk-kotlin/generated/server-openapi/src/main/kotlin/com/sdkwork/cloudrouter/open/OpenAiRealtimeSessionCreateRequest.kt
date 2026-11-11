package com.sdkwork.cloudrouter.open

data class OpenAiRealtimeSessionCreateRequest(
    val clientSecret: Map<String, String>? = null,
    val inputAudioFormat: String? = null,
    val inputAudioTranscription: Map<String, String>? = null,
    val instructions: String? = null,
    val maxResponseOutputTokens: Int? = null,
    val modalities: List<String>? = null,
    val outputAudioFormat: String? = null,
    val prompt: Map<String, String>? = null,
    val speed: Double? = null,
    val temperature: Double? = null,
    val toolChoice: String? = null,
    val tools: List<Map<String, String>>? = null,
    val tracing: Map<String, String>? = null,
    val truncation: Map<String, String>? = null,
    val turnDetection: Map<String, String>? = null,
    val voice: String? = null
)
