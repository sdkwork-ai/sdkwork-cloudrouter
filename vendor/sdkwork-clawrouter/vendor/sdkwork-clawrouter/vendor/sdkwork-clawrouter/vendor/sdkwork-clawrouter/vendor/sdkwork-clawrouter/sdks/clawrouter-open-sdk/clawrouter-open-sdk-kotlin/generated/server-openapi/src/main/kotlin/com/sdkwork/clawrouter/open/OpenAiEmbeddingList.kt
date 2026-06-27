package com.sdkwork.clawrouter.open

data class OpenAiEmbeddingList(
    val data_: List<OpenAiEmbedding>? = null,
    val model: String? = null,
    val object_: String? = null,
    val usage: OpenAiEmbeddingUsage? = null
)
