package com.sdkwork.clawrouter.open

data class OpenAiRealtimeTranscriptionSession(
    val clientSecret: OpenAiRealtimeClientSecretValue? = null,
    val id: String? = null,
    val inputAudioFormat: String? = null,
    val inputAudioTranscription: String? = null,
    val object_: String? = null
)
