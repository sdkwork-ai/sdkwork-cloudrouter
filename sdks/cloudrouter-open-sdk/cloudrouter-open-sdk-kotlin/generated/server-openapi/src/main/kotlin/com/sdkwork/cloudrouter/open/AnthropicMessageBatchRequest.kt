package com.sdkwork.cloudrouter.open

data class AnthropicMessageBatchRequest(
    val customId: String,
    val params: AnthropicMessageCreateRequest
)
