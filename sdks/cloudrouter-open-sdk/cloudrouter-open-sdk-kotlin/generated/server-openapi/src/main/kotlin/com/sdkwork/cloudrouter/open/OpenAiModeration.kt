package com.sdkwork.cloudrouter.open

data class OpenAiModeration(
    val id: String,
    val model: String,
    val results: List<OpenAiModerationResult>
)
