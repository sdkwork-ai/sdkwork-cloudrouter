package com.sdkwork.cloudrouter.open

data class OpenAiDeepSeekWebSearchRequest(
    val count: Int? = null,
    val localization: String? = null,
    val needContent: Boolean? = null,
    val oriQuestion: String? = null,
    val query: String? = null
)
