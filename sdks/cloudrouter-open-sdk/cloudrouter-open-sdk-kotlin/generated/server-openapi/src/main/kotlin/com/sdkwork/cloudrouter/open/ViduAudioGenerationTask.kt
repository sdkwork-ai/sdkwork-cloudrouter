package com.sdkwork.cloudrouter.open

data class ViduAudioGenerationTask(
    val createdAt: String? = null,
    val creations: List<ViduCreation>? = null,
    val credits: Int? = null,
    val duration: Int? = null,
    val errCode: String? = null,
    val model: String? = null,
    val prompt: String? = null,
    val seed: Int? = null,
    val state: String? = null,
    val taskId: String? = null
)
