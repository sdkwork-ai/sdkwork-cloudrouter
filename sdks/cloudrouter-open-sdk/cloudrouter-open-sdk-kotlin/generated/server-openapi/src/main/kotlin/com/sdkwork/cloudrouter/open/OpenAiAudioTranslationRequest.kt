package com.sdkwork.cloudrouter.open

data class OpenAiAudioTranslationRequest(
    val file_: OpenAiFileReferenceInput,
    val model: String,
    val prompt: String? = null,
    val responseFormat: String? = null
)
