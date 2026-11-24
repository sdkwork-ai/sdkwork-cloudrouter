package com.sdkwork.cloudrouter.open

data class OpenAiAudioTranscriptionMultipartRequest(
    val file_: String,
    val language: String? = null,
    val model: String,
    val prompt: String? = null,
    val responseFormat: String? = null
)
