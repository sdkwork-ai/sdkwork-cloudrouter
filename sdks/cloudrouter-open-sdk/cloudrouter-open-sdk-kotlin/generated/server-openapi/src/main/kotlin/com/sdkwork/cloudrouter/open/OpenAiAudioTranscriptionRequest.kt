package com.sdkwork.cloudrouter.open

data class OpenAiAudioTranscriptionRequest(
    val file_: OpenAiFileReferenceInput? = null,
    val language: String? = null,
    val model: String? = null,
    val prompt: String? = null,
    val responseFormat: String? = null
)
