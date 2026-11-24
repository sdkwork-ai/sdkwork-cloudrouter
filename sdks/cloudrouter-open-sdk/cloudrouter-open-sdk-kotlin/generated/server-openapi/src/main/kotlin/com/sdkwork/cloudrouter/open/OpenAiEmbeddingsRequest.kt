package com.sdkwork.cloudrouter.open

data class OpenAiEmbeddingsRequest(
    val dimensions: Int? = null,
    val encodingFormat: String? = null,
    val input: String,
    val model: String,
    val user: String? = null
)
