package com.sdkwork.cloudrouter.open

data class GeminiImageGenerationResponse(
    val error: Map<String, String>? = null,
    val predictions: List<Map<String, String>>? = null
)
