package com.sdkwork.cloudrouter.open

data class KlingSoundGenerationRequest(
    val callbackUrl: String? = null,
    val duration: Double,
    val externalTaskId: String? = null,
    val prompt: String
)
