package com.sdkwork.cloudrouter.open

data class GeminiVideoGenerationRequest(
    val instances: List<Map<String, String>>,
    val parameters: Map<String, String>? = null
)
