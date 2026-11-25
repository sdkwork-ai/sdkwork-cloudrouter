package com.sdkwork.cloudrouter.open

data class MinimaxVideoGenerationRequest(
    val callbackUrl: String? = null,
    val duration: Int? = null,
    val fastPretreatment: Boolean? = null,
    val firstFrameImage: String? = null,
    val lastFrameImage: String? = null,
    val model: String,
    val prompt: String,
    val promptOptimizer: Boolean? = null,
    val resolution: String? = null
)
