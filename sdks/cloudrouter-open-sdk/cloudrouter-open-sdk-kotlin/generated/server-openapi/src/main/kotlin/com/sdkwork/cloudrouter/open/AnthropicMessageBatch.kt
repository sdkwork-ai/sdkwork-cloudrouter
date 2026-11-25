package com.sdkwork.cloudrouter.open

data class AnthropicMessageBatch(
    val cancelInitiatedAt: String? = null,
    val createdAt: String? = null,
    val endedAt: String? = null,
    val expiresAt: String? = null,
    val id: String,
    val processingStatus: String,
    val requestCounts: AnthropicMessageBatchRequestCounts,
    val resultsUrl: String? = null,
    val type: String
)
