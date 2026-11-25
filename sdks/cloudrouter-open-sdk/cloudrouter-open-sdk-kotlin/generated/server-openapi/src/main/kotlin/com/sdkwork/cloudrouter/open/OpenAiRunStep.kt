package com.sdkwork.cloudrouter.open

data class OpenAiRunStep(
    val assistantId: String,
    val cancelledAt: Int? = null,
    val completedAt: Int? = null,
    val createdAt: Int,
    val expiredAt: Int? = null,
    val failedAt: Int? = null,
    val id: String,
    val lastError: String? = null,
    val metadata: Map<String, String>? = null,
    val object_: String,
    val runId: String,
    val status: String,
    val stepDetails: String? = null,
    val threadId: String,
    val type: String,
    val usage: OpenAiTokenUsage? = null
)
