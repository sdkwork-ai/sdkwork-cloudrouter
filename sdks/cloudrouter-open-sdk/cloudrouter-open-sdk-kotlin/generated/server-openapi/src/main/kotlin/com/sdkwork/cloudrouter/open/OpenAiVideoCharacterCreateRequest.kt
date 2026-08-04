package com.sdkwork.cloudrouter.open

data class OpenAiVideoCharacterCreateRequest(
    val description: String? = null,
    val image: String? = null,
    val metadata: Map<String, String>? = null,
    val name: String? = null
)
