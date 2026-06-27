package com.sdkwork.clawrouter.open

data class OpenAiResponsesRequest(
    val background: Boolean? = null,
    val conversation: String? = null,
    val include: List<String>? = null,
    val input: String? = null,
    val instructions: String? = null,
    val maxOutputTokens: Int? = null,
    val maxToolCalls: Int? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val parallelToolCalls: Boolean? = null,
    val previousResponseId: String? = null,
    val prompt: OpenAiPromptReference? = null,
    val promptCacheKey: String? = null,
    val reasoning: OpenAiReasoningConfig? = null,
    val serviceTier: String? = null,
    val store: Boolean? = null,
    val stream: Boolean? = null,
    val temperature: Double? = null,
    val text: OpenAiTextConfig? = null,
    val toolChoice: OpenAiToolChoice? = null,
    val tools: List<OpenAiTool>? = null,
    val topLogprobs: Int? = null,
    val topP: Double? = null,
    val truncation: String? = null,
    val user: String? = null
)
