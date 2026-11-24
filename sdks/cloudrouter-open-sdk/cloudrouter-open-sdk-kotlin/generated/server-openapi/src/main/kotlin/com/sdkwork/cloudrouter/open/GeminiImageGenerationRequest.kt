package com.sdkwork.cloudrouter.open

data class GeminiImageGenerationRequest(
    val instances: List<Map<String, String>>,
    val parameters: Map<String, String>? = null
)
