package com.sdkwork.cloudrouter.open

data class ZhipuImageGenerationRequest(
    val model: String,
    val prompt: String,
    val quality: String? = null,
    val size: String? = null,
    val userId: String? = null,
    val watermarkEnabled: Boolean? = null
)
