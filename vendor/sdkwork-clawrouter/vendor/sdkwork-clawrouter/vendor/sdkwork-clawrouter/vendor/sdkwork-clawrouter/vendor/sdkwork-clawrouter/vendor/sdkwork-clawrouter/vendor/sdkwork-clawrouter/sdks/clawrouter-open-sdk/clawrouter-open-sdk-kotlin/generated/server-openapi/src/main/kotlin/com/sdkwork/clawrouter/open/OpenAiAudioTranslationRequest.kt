package com.sdkwork.clawrouter.open

data class OpenAiAudioTranslationRequest(
    val file_: OpenAiFileReferenceInput? = null,
    val model: String? = null,
    val prompt: String? = null,
    val responseFormat: String? = null
)
