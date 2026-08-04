package com.sdkwork.cloudrouter.open

data class OpenAiVectorStoreSearchResponse(
    val data_: List<OpenAiVectorStoreSearchResult>? = null,
    val object_: String? = null,
    val searchQuery: List<String>? = null
)
