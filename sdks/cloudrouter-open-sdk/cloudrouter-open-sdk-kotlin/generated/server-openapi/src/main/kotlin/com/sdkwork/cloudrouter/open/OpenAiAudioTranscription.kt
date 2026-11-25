package com.sdkwork.cloudrouter.open

data class OpenAiAudioTranscription(
    val duration: Double? = null,
    val language: String? = null,
    val segments: List<String>? = null,
    val text: String,
    val words: List<String>? = null
)
