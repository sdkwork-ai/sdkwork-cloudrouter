package com.sdkwork.cloudrouter.open

data class OpenAiEmbedding(
    val embedding: List<Double>,
    val index: Int,
    val object_: String
)
