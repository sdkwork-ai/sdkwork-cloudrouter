package com.sdkwork.clawrouter.open

data class OpenAiImageEditRequest(
    val image: OpenAiImageReferenceInputList? = null,
    val mask: OpenAiImageReferenceInput? = null,
    val model: String? = null,
    val prompt: String? = null
)
