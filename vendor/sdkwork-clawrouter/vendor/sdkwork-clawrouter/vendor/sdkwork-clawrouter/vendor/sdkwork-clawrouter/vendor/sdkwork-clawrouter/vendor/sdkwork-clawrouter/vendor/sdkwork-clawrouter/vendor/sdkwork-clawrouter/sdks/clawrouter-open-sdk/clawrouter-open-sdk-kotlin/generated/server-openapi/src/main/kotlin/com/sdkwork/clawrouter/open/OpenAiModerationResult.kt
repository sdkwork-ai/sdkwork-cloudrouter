package com.sdkwork.clawrouter.open

data class OpenAiModerationResult(
    val categories: Map<String, String>? = null,
    val categoryScores: Map<String, Double>? = null,
    val flagged: Boolean? = null
)
