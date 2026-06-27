package com.sdkwork.clawrouter.open

data class ViduReferenceToImageRequest(
    val aspectRatio: String? = null,
    val callbackUrl: String? = null,
    val images: List<String>? = null,
    val model: String? = null,
    val payload: String? = null,
    val prompt: String? = null,
    val seed: Int? = null,
    val style: String? = null
)
