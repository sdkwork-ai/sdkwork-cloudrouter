package com.sdkwork.cloudrouter.open

data class PixverseVideoGenerationRequest(
    val aspectRatio: String,
    val duration: Int,
    val generateAudioSwitch: Boolean? = null,
    val generateMultiClipSwitch: Boolean? = null,
    val model: String,
    val prompt: String,
    val quality: String,
    val seed: Int? = null,
    val webhookId: String? = null
)
