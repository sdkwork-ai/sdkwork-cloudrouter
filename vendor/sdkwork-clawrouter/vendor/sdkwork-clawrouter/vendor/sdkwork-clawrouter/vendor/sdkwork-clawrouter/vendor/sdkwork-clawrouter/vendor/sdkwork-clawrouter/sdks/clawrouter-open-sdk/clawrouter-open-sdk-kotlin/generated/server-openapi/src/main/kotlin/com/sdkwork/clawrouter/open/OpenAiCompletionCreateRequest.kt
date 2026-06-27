package com.sdkwork.clawrouter.open

data class OpenAiCompletionCreateRequest(
    val bestOf: Int? = null,
    val echo: Boolean? = null,
    val frequencyPenalty: Double? = null,
    val logitBias: Map<String, Double>? = null,
    val logprobs: Int? = null,
    val maxTokens: Int? = null,
    val model: String? = null,
    val n: Int? = null,
    val presencePenalty: Double? = null,
    val prompt: String? = null,
    val seed: Int? = null,
    val stop: String? = null,
    val stream: Boolean? = null,
    val suffix: String? = null,
    val temperature: Double? = null,
    val topP: Double? = null,
    val user: String? = null
)
