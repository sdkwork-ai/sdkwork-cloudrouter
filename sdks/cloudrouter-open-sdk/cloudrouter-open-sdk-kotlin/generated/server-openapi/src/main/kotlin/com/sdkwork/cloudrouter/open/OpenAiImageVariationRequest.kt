package com.sdkwork.cloudrouter.open

data class OpenAiImageVariationRequest(
    val image: OpenAiImageReferenceInput,
    val model: String,
    val size: String? = null
)
