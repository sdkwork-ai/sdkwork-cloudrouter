package com.sdkwork.cloudrouter.open

data class OpenAiNamedToolChoice(
    val function: OpenAiNamedToolChoiceFunction? = null,
    val type: String? = null
)
