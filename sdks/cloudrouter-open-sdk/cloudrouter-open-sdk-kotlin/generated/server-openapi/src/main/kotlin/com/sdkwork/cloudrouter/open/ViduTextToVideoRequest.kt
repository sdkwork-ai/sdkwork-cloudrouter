package com.sdkwork.cloudrouter.open

data class ViduTextToVideoRequest(
    val aspectRatio: String? = null,
    val audio: Boolean? = null,
    val callbackUrl: String? = null,
    val duration: Int? = null,
    val metaData: String? = null,
    val model: String? = null,
    val offPeak: Boolean? = null,
    val payload: String? = null,
    val prompt: String? = null,
    val resolution: String? = null,
    val seed: Int? = null,
    val watermark: Boolean? = null,
    val wmPosition: Int? = null,
    val wmUrl: String? = null
)
