package com.sdkwork.cloudrouter.open

data class OpenAiContainerFileCreateMultipartRequest(
    val file_: String,
    val metadata: String? = null,
    val purpose: String? = null
)
