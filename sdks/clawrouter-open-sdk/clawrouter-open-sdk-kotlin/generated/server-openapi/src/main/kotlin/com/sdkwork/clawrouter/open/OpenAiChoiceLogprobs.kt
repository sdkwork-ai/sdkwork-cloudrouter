package com.sdkwork.clawrouter.open

data class OpenAiChoiceLogprobs(
    val content: List<OpenAiTokenLogprob>? = null,
    val refusal: List<OpenAiTokenLogprob>? = null
)
