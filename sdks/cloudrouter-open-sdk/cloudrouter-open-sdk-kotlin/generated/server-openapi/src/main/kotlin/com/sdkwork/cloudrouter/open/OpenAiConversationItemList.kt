package com.sdkwork.cloudrouter.open

data class OpenAiConversationItemList(
    val data_: List<OpenAiConversationItem>,
    val firstId: String? = null,
    val hasMore: Boolean? = null,
    val lastId: String? = null,
    val object_: String
)
