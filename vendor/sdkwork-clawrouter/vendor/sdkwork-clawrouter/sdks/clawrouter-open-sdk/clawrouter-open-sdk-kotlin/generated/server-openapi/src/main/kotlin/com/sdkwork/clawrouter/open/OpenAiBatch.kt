package com.sdkwork.clawrouter.open

data class OpenAiBatch(
    val cancelledAt: Int? = null,
    val cancellingAt: Int? = null,
    val completedAt: Int? = null,
    val completionWindow: String? = null,
    val createdAt: Int? = null,
    val endpoint: String? = null,
    val errorFileId: String? = null,
    val errors: String? = null,
    val expiredAt: Int? = null,
    val expiresAt: Int? = null,
    val failedAt: Int? = null,
    val finalizingAt: Int? = null,
    val id: String? = null,
    val inProgressAt: Int? = null,
    val inputFileId: String? = null,
    val metadata: Map<String, String>? = null,
    val object_: String? = null,
    val outputFileId: String? = null,
    val requestCounts: OpenAiBatchRequestCounts? = null,
    val status: String? = null
)
