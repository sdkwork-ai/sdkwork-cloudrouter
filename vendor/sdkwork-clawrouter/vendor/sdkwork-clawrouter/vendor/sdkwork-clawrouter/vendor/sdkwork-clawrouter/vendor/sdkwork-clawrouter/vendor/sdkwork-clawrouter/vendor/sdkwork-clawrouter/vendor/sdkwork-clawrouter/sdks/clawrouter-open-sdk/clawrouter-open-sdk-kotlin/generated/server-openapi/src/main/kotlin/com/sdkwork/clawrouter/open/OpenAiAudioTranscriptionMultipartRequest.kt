package com.sdkwork.clawrouter.open

data class OpenAiAudioTranscriptionMultipartRequest(
    val file_: String? = null,
    val language: String? = null,
    val model: String? = null,
    val prompt: String? = null,
    val responseFormat: String? = null
)
