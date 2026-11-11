package com.sdkwork.cloudrouter.open

data class JimengVideoGenerationRequest(
    val callbackUrl: String? = null,
    val duration: Int? = null,
    val fps: Int? = null,
    val image: String? = null,
    val model: String? = null,
    val prompt: String? = null,
    val ratio: String? = null,
    val seed: Int? = null
)
