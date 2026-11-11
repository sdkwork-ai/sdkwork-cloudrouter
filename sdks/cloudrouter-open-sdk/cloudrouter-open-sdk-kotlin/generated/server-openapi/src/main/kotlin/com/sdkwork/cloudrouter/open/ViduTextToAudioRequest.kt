package com.sdkwork.cloudrouter.open

data class ViduTextToAudioRequest(
    val bgm: Boolean? = null,
    val callbackUrl: String? = null,
    val duration: Double? = null,
    val model: String? = null,
    val offPeak: Boolean? = null,
    val payload: String? = null,
    val prompt: String? = null,
    val seed: Int? = null
)
