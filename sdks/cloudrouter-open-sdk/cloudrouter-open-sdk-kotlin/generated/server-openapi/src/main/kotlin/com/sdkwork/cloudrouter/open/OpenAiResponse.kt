package com.sdkwork.cloudrouter.open

data class OpenAiResponse(
    val createdAt: Int? = null,
    val error: OpenAiResponseError? = null,
    val id: String,
    val incompleteDetails: OpenAiIncompleteDetails? = null,
    val model: String,
    val object_: String,
    val output: List<OpenAiResponseOutputItem>,
    val outputText: String? = null,
    val status: String? = null,
    val usage: OpenAiResponseUsage? = null
)
