package com.sdkwork.clawrouter.open

data class OpenAiRunStep(
    val assistantId: String? = null,
    val cancelledAt: Int? = null,
    val completedAt: Int? = null,
    val createdAt: Int? = null,
    val expiredAt: Int? = null,
    val failedAt: Int? = null,
    val id: String? = null,
    val lastError: String? = null,
    val metadata: Map<String, String>? = null,
    val object_: String? = null,
    val runId: String? = null,
    val status: String? = null,
    val stepDetails: String? = null,
    val threadId: String? = null,
    val type: String? = null,
    val usage: OpenAiTokenUsage? = null
)
