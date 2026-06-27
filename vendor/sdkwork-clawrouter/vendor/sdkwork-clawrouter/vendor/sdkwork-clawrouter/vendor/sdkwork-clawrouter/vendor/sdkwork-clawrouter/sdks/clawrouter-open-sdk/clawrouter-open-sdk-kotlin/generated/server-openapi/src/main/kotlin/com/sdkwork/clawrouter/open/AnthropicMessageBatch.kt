package com.sdkwork.clawrouter.open

data class AnthropicMessageBatch(
    val cancelInitiatedAt: String? = null,
    val createdAt: String? = null,
    val endedAt: String? = null,
    val expiresAt: String? = null,
    val id: String? = null,
    val processingStatus: String? = null,
    val requestCounts: AnthropicMessageBatchRequestCounts? = null,
    val resultsUrl: String? = null,
    val type: String? = null
)
