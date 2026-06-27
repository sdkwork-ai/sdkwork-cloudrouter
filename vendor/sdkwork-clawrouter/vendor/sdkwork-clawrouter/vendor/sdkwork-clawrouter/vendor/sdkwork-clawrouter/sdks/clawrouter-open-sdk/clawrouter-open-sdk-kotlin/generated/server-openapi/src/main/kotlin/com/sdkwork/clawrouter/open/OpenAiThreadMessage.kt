package com.sdkwork.clawrouter.open

data class OpenAiThreadMessage(
    val assistantId: String? = null,
    val attachments: List<String>? = null,
    val completedAt: Int? = null,
    val content: List<String>? = null,
    val createdAt: Int? = null,
    val id: String? = null,
    val incompleteAt: Int? = null,
    val incompleteDetails: String? = null,
    val metadata: Map<String, String>? = null,
    val object_: String? = null,
    val role: String? = null,
    val runId: String? = null,
    val status: String? = null,
    val threadId: String? = null
)
