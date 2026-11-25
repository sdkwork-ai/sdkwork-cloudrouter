package com.sdkwork.cloudrouter.open

data class BytedanceTtsAudioParams(
    val format: String,
    val loudnessRate: Int? = null,
    val sampleRate: Int,
    val speechRate: Int? = null
)
