package com.sdkwork.clawrouter.open

data class CreateCompletionChoice(
    val finishReason: String? = null,
    val index: Int? = null,
    val logprobs: CreateCompletionLogprobs? = null,
    val text: String? = null
)
