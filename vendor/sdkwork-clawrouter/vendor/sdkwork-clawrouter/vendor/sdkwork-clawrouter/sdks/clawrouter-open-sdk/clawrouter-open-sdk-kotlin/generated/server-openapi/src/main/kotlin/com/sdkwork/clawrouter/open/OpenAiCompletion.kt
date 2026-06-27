package com.sdkwork.clawrouter.open

data class OpenAiCompletion(
    val choices: List<CreateCompletionChoice>? = null,
    val created: Int? = null,
    val id: String? = null,
    val model: String? = null,
    val object_: String? = null,
    val systemFingerprint: String? = null,
    val usage: OpenAiTokenUsage? = null
)
