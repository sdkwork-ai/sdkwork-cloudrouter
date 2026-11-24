package com.sdkwork.cloudrouter.open

data class OpenAiRun(
    val assistantId: String,
    val cancelledAt: Int? = null,
    val completedAt: Int? = null,
    val createdAt: Int,
    val expiresAt: Int? = null,
    val failedAt: Int? = null,
    val id: String,
    val instructions: String? = null,
    val lastError: String? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val object_: String,
    val requiredAction: String? = null,
    val startedAt: Int? = null,
    val status: String,
    val threadId: String,
    val tools: List<String>? = null,
    val usage: OpenAiTokenUsage? = null
)
