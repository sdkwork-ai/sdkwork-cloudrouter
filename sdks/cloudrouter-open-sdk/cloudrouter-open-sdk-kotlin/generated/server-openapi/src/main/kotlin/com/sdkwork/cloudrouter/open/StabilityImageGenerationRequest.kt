package com.sdkwork.cloudrouter.open

data class StabilityImageGenerationRequest(
    val aspectRatio: String? = null,
    val cfgScale: Double? = null,
    val image: String? = null,
    val mode: String? = null,
    val model: String? = null,
    val negativePrompt: String? = null,
    val outputFormat: String? = null,
    val prompt: String? = null,
    val seed: Int? = null,
    val strength: Double? = null,
    val stylePreset: String? = null
)
