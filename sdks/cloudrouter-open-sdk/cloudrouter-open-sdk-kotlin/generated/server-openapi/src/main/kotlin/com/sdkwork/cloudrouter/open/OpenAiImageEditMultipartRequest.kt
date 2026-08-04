package com.sdkwork.cloudrouter.open

data class OpenAiImageEditMultipartRequest(
    val image: String? = null,
    val mask: String? = null,
    val model: String? = null,
    val prompt: String? = null
)
