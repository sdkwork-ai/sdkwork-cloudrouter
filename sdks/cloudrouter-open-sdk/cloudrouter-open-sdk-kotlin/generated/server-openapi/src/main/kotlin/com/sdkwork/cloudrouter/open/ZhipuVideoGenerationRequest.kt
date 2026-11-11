package com.sdkwork.cloudrouter.open

data class ZhipuVideoGenerationRequest(
    val duration: Int? = null,
    val fps: Int? = null,
    val imageUrl: String? = null,
    val model: String? = null,
    val prompt: String? = null,
    val quality: String? = null,
    val requestId: String? = null,
    val size: String? = null,
    val userId: String? = null,
    val watermarkEnabled: Boolean? = null,
    val withAudio: Boolean? = null
)
