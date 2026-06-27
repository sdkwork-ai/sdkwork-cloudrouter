package com.sdkwork.clawrouter.open

data class OpenAiChatCompletionChoice(
    val finishReason: String? = null,
    val index: Int? = null,
    val logprobs: OpenAiChoiceLogprobs? = null,
    val message: OpenAiChatMessage? = null
)
