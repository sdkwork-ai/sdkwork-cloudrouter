package com.sdkwork.clawrouter.open

data class OpenAiThreadMessageList(
    val data_: List<OpenAiThreadMessage>? = null,
    val firstId: String? = null,
    val hasMore: Boolean? = null,
    val lastId: String? = null,
    val object_: String? = null
)
