package com.sdkwork.cloudrouter.open

data class OpenAiThreadAndRunCreateRequest(
    val assistantId: String? = null,
    val instructions: String? = null,
    val maxCompletionTokens: Int? = null,
    val maxPromptTokens: Int? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val parallelToolCalls: Boolean? = null,
    val responseFormat: String? = null,
    val stream: Boolean? = null,
    val temperature: Double? = null,
    val thread: OpenAiThreadCreateRequest? = null,
    val toolChoice: String? = null,
    val toolResources: String? = null,
    val tools: List<String>? = null,
    val topP: Double? = null,
    val truncationStrategy: String? = null
)
