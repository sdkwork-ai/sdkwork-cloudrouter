package com.sdkwork.clawrouter.open

data class OpenAiChatCompletion(
    val choices: List<OpenAiChatCompletionChoice>? = null,
    val created: Int? = null,
    val id: String? = null,
    val model: String? = null,
    val object_: String? = null,
    val requestId: String? = null,
    val serviceTier: String? = null,
    val systemFingerprint: String? = null,
    val usage: OpenAiTokenUsage? = null
)
