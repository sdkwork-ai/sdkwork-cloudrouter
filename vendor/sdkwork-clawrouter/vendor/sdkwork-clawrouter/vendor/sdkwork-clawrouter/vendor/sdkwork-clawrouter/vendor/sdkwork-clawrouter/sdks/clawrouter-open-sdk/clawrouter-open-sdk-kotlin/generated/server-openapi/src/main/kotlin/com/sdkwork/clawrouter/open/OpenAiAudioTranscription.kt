package com.sdkwork.clawrouter.open

data class OpenAiAudioTranscription(
    val duration: Double? = null,
    val language: String? = null,
    val segments: List<String>? = null,
    val text: String? = null,
    val words: List<String>? = null
)
