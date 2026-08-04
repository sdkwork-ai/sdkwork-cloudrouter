package com.sdkwork.cloudrouter.open

data class OpenAiVectorStoreSearchRequest(
    val filters: String? = null,
    val maxNumResults: Int? = null,
    val query: String? = null,
    val rankingOptions: String? = null,
    val rewriteQuery: Boolean? = null
)
