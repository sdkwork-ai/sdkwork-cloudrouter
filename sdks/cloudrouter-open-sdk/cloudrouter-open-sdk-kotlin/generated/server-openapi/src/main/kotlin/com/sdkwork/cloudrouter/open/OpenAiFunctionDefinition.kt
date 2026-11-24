package com.sdkwork.cloudrouter.open

data class OpenAiFunctionDefinition(
    val description: String? = null,
    val name: String,
    val parameters: OpenAiJsonSchema? = null,
    val strict: Boolean? = null
)
