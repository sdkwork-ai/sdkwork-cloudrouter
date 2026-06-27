package com.sdkwork.clawrouter.open

data class OpenAiFunctionDefinition(
    val description: String? = null,
    val name: String? = null,
    val parameters: OpenAiJsonSchema? = null,
    val strict: Boolean? = null
)
