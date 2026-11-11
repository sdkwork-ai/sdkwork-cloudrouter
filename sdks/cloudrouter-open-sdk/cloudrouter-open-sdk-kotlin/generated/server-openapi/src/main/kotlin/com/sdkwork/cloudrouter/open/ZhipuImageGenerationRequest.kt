package com.sdkwork.cloudrouter.open

data class ZhipuImageGenerationRequest(
    val model: String? = null,
    val prompt: String? = null,
    val quality: String? = null,
    val size: String? = null,
    val userId: String? = null,
    val watermarkEnabled: Boolean? = null
)
