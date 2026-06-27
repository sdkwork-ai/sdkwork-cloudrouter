package com.sdkwork.clawrouter.open

data class CreateCompletionLogprobs(
    val textOffset: List<Int>? = null,
    val tokenLogprobs: List<Double>? = null,
    val tokens: List<String>? = null,
    val topLogprobs: List<Map<String, Any>>? = null
)
