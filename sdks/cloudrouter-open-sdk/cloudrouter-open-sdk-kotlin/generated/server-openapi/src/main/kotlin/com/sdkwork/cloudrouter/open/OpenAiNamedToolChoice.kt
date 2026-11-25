package com.sdkwork.cloudrouter.open

data class OpenAiNamedToolChoice(
    val function: OpenAiNamedToolChoiceFunction,
    val type: String
)
