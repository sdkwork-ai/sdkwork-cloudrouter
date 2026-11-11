package com.sdkwork.cloudrouter.open

data class ViduVideoGenerationTask(
    val aspectRatio: String? = null,
    val createdAt: String? = null,
    val creations: List<ViduCreation>? = null,
    val credits: Int? = null,
    val duration: Int? = null,
    val errCode: String? = null,
    val model: String? = null,
    val offPeak: Boolean? = null,
    val payload: String? = null,
    val prompt: String? = null,
    val resolution: String? = null,
    val seed: Int? = null,
    val state: String? = null,
    val taskId: String? = null,
    val watermark: Boolean? = null
)
