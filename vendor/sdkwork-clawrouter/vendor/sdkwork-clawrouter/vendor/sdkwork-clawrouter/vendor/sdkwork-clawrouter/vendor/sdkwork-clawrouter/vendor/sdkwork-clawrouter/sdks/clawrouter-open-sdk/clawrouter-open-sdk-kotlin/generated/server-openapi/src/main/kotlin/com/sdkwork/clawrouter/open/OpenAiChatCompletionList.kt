package com.sdkwork.clawrouter.open

data class OpenAiChatCompletionList(
    val data_: List<OpenAiChatCompletion>? = null,
    val firstId: String? = null,
    val hasMore: Boolean? = null,
    val lastId: String? = null,
    val object_: String? = null
)
