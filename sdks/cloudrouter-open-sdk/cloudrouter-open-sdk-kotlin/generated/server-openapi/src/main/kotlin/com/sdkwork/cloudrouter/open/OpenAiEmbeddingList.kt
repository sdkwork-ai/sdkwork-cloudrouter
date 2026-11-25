package com.sdkwork.cloudrouter.open

data class OpenAiEmbeddingList(
    val data_: List<OpenAiEmbedding>,
    val model: String? = null,
    val object_: String,
    val usage: OpenAiEmbeddingUsage
)
