package com.sdkwork.cloudrouter.open

data class PixverseVideoGenerationRequest(
    val aspectRatio: String? = null,
    val duration: Int? = null,
    val generateAudioSwitch: Boolean? = null,
    val generateMultiClipSwitch: Boolean? = null,
    val model: String? = null,
    val prompt: String? = null,
    val quality: String? = null,
    val seed: Int? = null,
    val webhookId: String? = null
)
