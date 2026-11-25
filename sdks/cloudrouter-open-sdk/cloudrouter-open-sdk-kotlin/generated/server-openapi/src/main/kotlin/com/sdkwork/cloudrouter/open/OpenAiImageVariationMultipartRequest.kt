package com.sdkwork.cloudrouter.open

data class OpenAiImageVariationMultipartRequest(
    val image: String,
    val model: String,
    val size: String? = null
)
