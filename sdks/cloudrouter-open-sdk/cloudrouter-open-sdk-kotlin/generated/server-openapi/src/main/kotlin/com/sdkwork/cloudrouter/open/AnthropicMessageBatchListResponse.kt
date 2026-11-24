package com.sdkwork.cloudrouter.open

data class AnthropicMessageBatchListResponse(
    val data_: List<AnthropicMessageBatch>,
    val firstId: String? = null,
    val hasMore: Boolean? = null,
    val lastId: String? = null
)
