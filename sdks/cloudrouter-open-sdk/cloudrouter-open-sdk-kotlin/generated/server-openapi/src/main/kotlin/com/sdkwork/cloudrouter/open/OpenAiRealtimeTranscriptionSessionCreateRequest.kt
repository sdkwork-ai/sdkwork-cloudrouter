package com.sdkwork.cloudrouter.open

data class OpenAiRealtimeTranscriptionSessionCreateRequest(
    val include: List<String>? = null,
    val inputAudioFormat: String? = null,
    val inputAudioNoiseReduction: Map<String, String>? = null,
    val inputAudioTranscription: Map<String, String>? = null,
    val turnDetection: Map<String, String>? = null
)
