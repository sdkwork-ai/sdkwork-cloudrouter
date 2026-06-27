package com.sdkwork.clawrouter.open

data class OpenAiRun(
    val assistantId: String? = null,
    val cancelledAt: Int? = null,
    val completedAt: Int? = null,
    val createdAt: Int? = null,
    val expiresAt: Int? = null,
    val failedAt: Int? = null,
    val id: String? = null,
    val instructions: String? = null,
    val lastError: String? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val object_: String? = null,
    val requiredAction: String? = null,
    val startedAt: Int? = null,
    val status: String? = null,
    val threadId: String? = null,
    val tools: List<String>? = null,
    val usage: OpenAiTokenUsage? = null
)
