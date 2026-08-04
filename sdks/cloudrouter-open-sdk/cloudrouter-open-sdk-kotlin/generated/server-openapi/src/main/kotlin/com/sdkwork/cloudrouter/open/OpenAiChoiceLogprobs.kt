package com.sdkwork.cloudrouter.open

data class OpenAiChoiceLogprobs(
    val content: List<OpenAiTokenLogprob>? = null,
    val refusal: List<OpenAiTokenLogprob>? = null
)
