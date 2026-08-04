package com.sdkwork.cloudrouter.open

data class CreateCompletionChoice(
    val finishReason: String? = null,
    val index: Int? = null,
    val logprobs: CreateCompletionLogprobs? = null,
    val text: String? = null
)
