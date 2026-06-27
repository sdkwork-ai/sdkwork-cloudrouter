package com.sdkwork.clawrouter.open

data class ViduReferenceToVideoRequest(
    val aspectRatio: String? = null,
    val callbackUrl: String? = null,
    val duration: Int? = null,
    val images: List<String>? = null,
    val model: String? = null,
    val movementAmplitude: String? = null,
    val payload: String? = null,
    val prompt: String? = null,
    val resolution: String? = null,
    val seed: Int? = null
)
