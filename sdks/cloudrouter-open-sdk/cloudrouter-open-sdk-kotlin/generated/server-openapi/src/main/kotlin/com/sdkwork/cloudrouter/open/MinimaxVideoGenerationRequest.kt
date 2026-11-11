package com.sdkwork.cloudrouter.open

data class MinimaxVideoGenerationRequest(
    val callbackUrl: String? = null,
    val duration: Int? = null,
    val fastPretreatment: Boolean? = null,
    val firstFrameImage: String? = null,
    val lastFrameImage: String? = null,
    val model: String? = null,
    val prompt: String? = null,
    val promptOptimizer: Boolean? = null,
    val resolution: String? = null
)
