package com.sdkwork.clawrouter.open

data class OpenAiChatCompletionMessageList(
    val data_: List<OpenAiChatMessage>? = null,
    val firstId: String? = null,
    val hasMore: Boolean? = null,
    val lastId: String? = null,
    val object_: String? = null
)
