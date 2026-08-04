package com.sdkwork.cloudrouter.open

data class OpenAiResponseOutputItem(
    val content: List<OpenAiResponseOutputContent>? = null,
    val id: String? = null,
    val role: String? = null,
    val status: String? = null,
    val type: String? = null
)
