package com.sdkwork.cloudrouter.open

data class OpenAiTopLogprob(
    val bytes: List<Int>? = null,
    val logprob: Double,
    val token: String
)
