package com.sdkwork.cloudrouter.open

data class OpenAiBatch(
    val cancelledAt: Int? = null,
    val cancellingAt: Int? = null,
    val completedAt: Int? = null,
    val completionWindow: String,
    val createdAt: Int? = null,
    val endpoint: String,
    val errorFileId: String? = null,
    val errors: String? = null,
    val expiredAt: Int? = null,
    val expiresAt: Int? = null,
    val failedAt: Int? = null,
    val finalizingAt: Int? = null,
    val id: String,
    val inProgressAt: Int? = null,
    val inputFileId: String,
    val metadata: Map<String, String>? = null,
    val object_: String,
    val outputFileId: String? = null,
    val requestCounts: OpenAiBatchRequestCounts? = null,
    val status: String
)
