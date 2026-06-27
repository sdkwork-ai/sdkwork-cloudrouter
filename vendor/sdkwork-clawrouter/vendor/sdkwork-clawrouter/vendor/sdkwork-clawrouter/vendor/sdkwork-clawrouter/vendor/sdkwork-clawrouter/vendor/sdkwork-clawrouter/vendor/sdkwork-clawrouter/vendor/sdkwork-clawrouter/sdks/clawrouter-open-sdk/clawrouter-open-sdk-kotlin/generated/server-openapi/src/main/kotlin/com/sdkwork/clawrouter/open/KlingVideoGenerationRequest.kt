package com.sdkwork.clawrouter.open

data class KlingVideoGenerationRequest(
    val aspectRatio: String? = null,
    val callbackUrl: String? = null,
    val cfgScale: Double? = null,
    val duration: Int? = null,
    val image: String? = null,
    val imageTail: String? = null,
    val mode: String? = null,
    val model: String? = null,
    val negativePrompt: String? = null,
    val prompt: String? = null
)
