package com.sdkwork.clawrouter.open

data class OpenAiImageVariationRequest(
    val image: OpenAiImageReferenceInput? = null,
    val model: String? = null,
    val size: String? = null
)
