package com.sdkwork.clawrouter.open

data class OpenAiEmbeddingsRequest(
    val dimensions: Int? = null,
    val encodingFormat: String? = null,
    val input: String? = null,
    val model: String? = null,
    val user: String? = null
)
