package com.sdkwork.clawrouter.open

data class OpenAiModeration(
    val id: String? = null,
    val model: String? = null,
    val results: List<OpenAiModerationResult>? = null
)
