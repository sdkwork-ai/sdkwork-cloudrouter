package com.sdkwork.cloudrouter.open

data class OpenAiTokenLogprob(
    val bytes: List<Int>? = null,
    val logprob: Double? = null,
    val token: String? = null,
    val topLogprobs: List<OpenAiTopLogprob>? = null
)
