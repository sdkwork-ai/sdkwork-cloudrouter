package com.sdkwork.clawrouter.open

data class OpenAiImageGenerationRequest(
    val model: String? = null,
    val n: Int? = null,
    val prompt: String? = null,
    val quality: String? = null,
    val responseFormat: String? = null,
    val size: String? = null
)
