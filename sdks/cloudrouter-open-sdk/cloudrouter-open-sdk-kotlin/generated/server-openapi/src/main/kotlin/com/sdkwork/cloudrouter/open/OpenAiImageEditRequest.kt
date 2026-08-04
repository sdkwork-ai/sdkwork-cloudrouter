package com.sdkwork.cloudrouter.open

data class OpenAiImageEditRequest(
    val image: OpenAiImageReferenceInputList? = null,
    val mask: OpenAiImageReferenceInput? = null,
    val model: String? = null,
    val prompt: String? = null
)
