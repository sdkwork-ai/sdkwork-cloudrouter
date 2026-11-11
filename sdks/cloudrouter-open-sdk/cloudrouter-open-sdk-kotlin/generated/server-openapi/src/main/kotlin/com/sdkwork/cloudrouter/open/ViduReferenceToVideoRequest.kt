package com.sdkwork.cloudrouter.open

data class ViduReferenceToVideoRequest(
    val aspectRatio: String? = null,
    val audio: Boolean? = null,
    val autoSubjects: Boolean? = null,
    val bgm: Boolean? = null,
    val callbackUrl: String? = null,
    val duration: Int? = null,
    val images: List<String>? = null,
    val metaData: String? = null,
    val model: String? = null,
    val movementAmplitude: String? = null,
    val offPeak: Boolean? = null,
    val payload: String? = null,
    val prompt: String? = null,
    val resolution: String? = null,
    val seed: Int? = null,
    val sounds: List<Map<String, String>>? = null,
    val subjects: List<Map<String, String>>? = null,
    val watermark: Boolean? = null,
    val wmPosition: Int? = null,
    val wmUrl: String? = null
)
