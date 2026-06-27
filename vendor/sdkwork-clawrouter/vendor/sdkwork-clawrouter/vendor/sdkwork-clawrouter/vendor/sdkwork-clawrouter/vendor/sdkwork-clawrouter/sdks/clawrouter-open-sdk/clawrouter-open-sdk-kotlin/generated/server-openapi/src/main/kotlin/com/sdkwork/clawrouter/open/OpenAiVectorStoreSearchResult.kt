package com.sdkwork.clawrouter.open

data class OpenAiVectorStoreSearchResult(
    val attributes: Map<String, String>? = null,
    val content: List<String>? = null,
    val fileId: String? = null,
    val filename: String? = null,
    val score: Double? = null
)
