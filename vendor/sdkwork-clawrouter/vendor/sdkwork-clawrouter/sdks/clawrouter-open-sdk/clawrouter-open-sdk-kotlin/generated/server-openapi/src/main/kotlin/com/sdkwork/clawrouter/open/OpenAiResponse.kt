package com.sdkwork.clawrouter.open

data class OpenAiResponse(
    val createdAt: Int? = null,
    val error: OpenAiResponseError? = null,
    val id: String? = null,
    val incompleteDetails: OpenAiIncompleteDetails? = null,
    val model: String? = null,
    val object_: String? = null,
    val output: List<OpenAiResponseOutputItem>? = null,
    val outputText: String? = null,
    val status: String? = null,
    val usage: OpenAiResponseUsage? = null
)
