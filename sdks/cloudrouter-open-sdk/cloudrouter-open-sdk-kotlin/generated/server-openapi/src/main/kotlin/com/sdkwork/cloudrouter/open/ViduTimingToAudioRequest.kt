package com.sdkwork.cloudrouter.open

data class ViduTimingToAudioRequest(
    val bgm: Boolean? = null,
    val callbackUrl: String? = null,
    val duration: Double? = null,
    val model: String? = null,
    val offPeak: Boolean? = null,
    val payload: String? = null,
    val seed: Int? = null,
    val timingPrompts: List<Map<String, String>>? = null
)
