package com.sdkwork.cloudrouter.open

data class OpenAiAudioTranslationMultipartRequest(
    val file_: String,
    val model: String,
    val prompt: String? = null,
    val responseFormat: String? = null
)
