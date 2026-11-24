package com.sdkwork.cloudrouter.open

data class OpenAiAudioTranscriptionRequest(
    val file_: OpenAiFileReferenceInput,
    val language: String? = null,
    val model: String,
    val prompt: String? = null,
    val responseFormat: String? = null
)
