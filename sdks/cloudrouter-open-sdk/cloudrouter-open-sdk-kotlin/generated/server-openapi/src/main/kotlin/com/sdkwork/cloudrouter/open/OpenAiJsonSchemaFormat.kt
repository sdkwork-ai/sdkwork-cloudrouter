package com.sdkwork.cloudrouter.open

data class OpenAiJsonSchemaFormat(
    val description: String? = null,
    val name: String,
    val schema: OpenAiJsonSchema? = null,
    val strict: Boolean? = null
)
