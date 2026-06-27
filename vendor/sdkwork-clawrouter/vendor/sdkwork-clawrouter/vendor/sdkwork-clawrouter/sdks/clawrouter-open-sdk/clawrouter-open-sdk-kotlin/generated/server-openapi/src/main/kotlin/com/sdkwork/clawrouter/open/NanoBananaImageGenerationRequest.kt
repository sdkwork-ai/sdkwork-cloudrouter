package com.sdkwork.clawrouter.open

data class NanoBananaImageGenerationRequest(
    val aspectRatio: String? = null,
    val callbackUrl: String? = null,
    val images: List<String>? = null,
    val model: String? = null,
    val prompt: String? = null,
    val seed: Int? = null,
    val size: String? = null
)
