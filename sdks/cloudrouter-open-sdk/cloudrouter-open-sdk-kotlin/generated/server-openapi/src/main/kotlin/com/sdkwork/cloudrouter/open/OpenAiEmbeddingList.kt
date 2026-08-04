package com.sdkwork.cloudrouter.open

data class OpenAiEmbeddingList(
    val data_: List<OpenAiEmbedding>? = null,
    val model: String? = null,
    val object_: String? = null,
    val usage: OpenAiEmbeddingUsage? = null
)
