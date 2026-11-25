package com.sdkwork.cloudrouter.open

data class OpenAiChatCompletionChoice(
    val finishReason: String? = null,
    val index: Int,
    val logprobs: OpenAiChoiceLogprobs? = null,
    val message: OpenAiChatMessage
)
