package com.sdkwork.clawrouter.open

data class AnthropicMessageBatchRequestCounts(
    val canceled: Int? = null,
    val errored: Int? = null,
    val expired: Int? = null,
    val processing: Int? = null,
    val succeeded: Int? = null
)
