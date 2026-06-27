package com.sdkwork.clawrouter.open

data class OpenAiRealtimeTranscriptionSessionCreateRequest(
    val inputAudioFormat: String? = null,
    val inputAudioTranscription: String? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val turnDetection: String? = null
)
