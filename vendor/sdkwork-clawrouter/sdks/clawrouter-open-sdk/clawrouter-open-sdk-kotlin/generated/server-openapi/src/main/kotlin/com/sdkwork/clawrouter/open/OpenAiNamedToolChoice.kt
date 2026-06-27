package com.sdkwork.clawrouter.open

data class OpenAiNamedToolChoice(
    val function: OpenAiNamedToolChoiceFunction? = null,
    val type: String? = null
)
