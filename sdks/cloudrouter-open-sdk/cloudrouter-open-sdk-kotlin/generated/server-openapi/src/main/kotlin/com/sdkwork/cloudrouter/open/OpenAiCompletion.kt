package com.sdkwork.cloudrouter.open

data class OpenAiCompletion(
    val choices: List<CreateCompletionChoice>,
    val created: Int,
    val id: String,
    val model: String,
    val object_: String,
    val systemFingerprint: String? = null,
    val usage: OpenAiTokenUsage? = null
)
