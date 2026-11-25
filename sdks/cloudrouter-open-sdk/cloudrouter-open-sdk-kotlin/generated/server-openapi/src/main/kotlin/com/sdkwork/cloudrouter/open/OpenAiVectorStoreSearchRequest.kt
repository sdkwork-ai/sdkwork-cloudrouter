package com.sdkwork.cloudrouter.open

data class OpenAiVectorStoreSearchRequest(
    val filters: String? = null,
    val maxNumResults: Int? = null,
    val query: String,
    val rankingOptions: String? = null,
    val rewriteQuery: Boolean? = null
)
