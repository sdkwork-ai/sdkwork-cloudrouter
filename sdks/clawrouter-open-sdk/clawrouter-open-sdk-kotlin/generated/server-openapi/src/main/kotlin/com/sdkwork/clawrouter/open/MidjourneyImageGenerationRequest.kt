package com.sdkwork.clawrouter.open

data class MidjourneyImageGenerationRequest(
    val aspectRatio: String? = null,
    val callbackUrl: String? = null,
    val model: String? = null,
    val prompt: String? = null,
    val seed: Int? = null,
    val style: String? = null
)
