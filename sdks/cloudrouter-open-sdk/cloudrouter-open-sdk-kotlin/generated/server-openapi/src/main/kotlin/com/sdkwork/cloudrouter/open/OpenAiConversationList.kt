package com.sdkwork.cloudrouter.open

data class OpenAiConversationList(
    val data_: List<OpenAiConversation>,
    val firstId: String? = null,
    val hasMore: Boolean? = null,
    val lastId: String? = null,
    val object_: String
)
