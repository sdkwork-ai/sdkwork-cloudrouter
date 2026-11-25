package com.sdkwork.cloudrouter.open

data class AlibabaImageGenerationRequest(
    val input: Map<String, String>,
    val model: String,
    val parameters: Map<String, String>? = null
)
