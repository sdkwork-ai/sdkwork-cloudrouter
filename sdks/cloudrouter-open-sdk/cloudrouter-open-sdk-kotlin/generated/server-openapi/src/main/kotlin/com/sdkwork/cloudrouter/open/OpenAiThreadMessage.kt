package com.sdkwork.cloudrouter.open

data class OpenAiThreadMessage(
    val assistantId: String? = null,
    val attachments: List<String>? = null,
    val completedAt: Int? = null,
    val content: List<String>,
    val createdAt: Int,
    val id: String,
    val incompleteAt: Int? = null,
    val incompleteDetails: String? = null,
    val metadata: Map<String, String>? = null,
    val object_: String,
    val role: String,
    val runId: String? = null,
    val status: String? = null,
    val threadId: String
)
