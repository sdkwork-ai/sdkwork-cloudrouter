package com.sdkwork.cloudrouter.open

data class OpenAiTokenLogprob(
    val bytes: List<Int>? = null,
    val logprob: Double,
    val token: String,
    val topLogprobs: List<OpenAiTopLogprob>? = null
)
