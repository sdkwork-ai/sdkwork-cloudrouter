package com.sdkwork.cloudrouter.open

data class OpenAiImageVariationRequest(
    val image: OpenAiImageReferenceInput? = null,
    val model: String? = null,
    val size: String? = null
)
