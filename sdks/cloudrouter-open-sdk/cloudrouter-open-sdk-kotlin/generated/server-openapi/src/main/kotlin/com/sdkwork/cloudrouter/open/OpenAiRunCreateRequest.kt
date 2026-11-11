package com.sdkwork.cloudrouter.open

data class OpenAiRunCreateRequest(
    val additionalInstructions: String? = null,
    val additionalMessages: List<OpenAiThreadMessageCreateRequest>? = null,
    val assistantId: String? = null,
    val instructions: String? = null,
    val maxCompletionTokens: Int? = null,
    val maxPromptTokens: Int? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val parallelToolCalls: Boolean? = null,
    val reasoningEffort: String? = null,
    val responseFormat: String? = null,
    val stream: Boolean? = null,
    val temperature: Double? = null,
    val toolChoice: String? = null,
    val tools: List<String>? = null,
    val topP: Double? = null,
    val truncationStrategy: String? = null
)
