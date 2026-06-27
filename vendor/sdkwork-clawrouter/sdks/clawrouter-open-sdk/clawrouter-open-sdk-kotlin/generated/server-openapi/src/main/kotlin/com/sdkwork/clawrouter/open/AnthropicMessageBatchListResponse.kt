package com.sdkwork.clawrouter.open

data class AnthropicMessageBatchListResponse(
    val data_: List<AnthropicMessageBatch>? = null,
    val firstId: String? = null,
    val hasMore: Boolean? = null,
    val lastId: String? = null
)
