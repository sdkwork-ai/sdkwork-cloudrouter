package com.sdkwork.cloudrouter.open

data class OpenAiChatCompletion(
    val choices: List<OpenAiChatCompletionChoice>,
    val created: Int,
    val id: String,
    val model: String,
    val object_: String,
    val requestId: String? = null,
    val serviceTier: String? = null,
    val systemFingerprint: String? = null,
    val usage: OpenAiTokenUsage? = null
)
