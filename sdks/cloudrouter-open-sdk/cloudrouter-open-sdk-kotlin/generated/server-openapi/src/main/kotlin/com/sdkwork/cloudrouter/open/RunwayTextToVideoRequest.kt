package com.sdkwork.cloudrouter.open

data class RunwayTextToVideoRequest(
    val audio: Boolean? = null,
    val bitrate: String? = null,
    val cfgScale: Double? = null,
    val contentModeration: Map<String, String>? = null,
    val draft: Boolean? = null,
    val draftTaskId: String? = null,
    val duration: Int? = null,
    val model: String? = null,
    val negativePrompt: String? = null,
    val outputFormat: String? = null,
    val promptExpansionMode: String? = null,
    val promptText: String? = null,
    val proresProfile: String? = null,
    val providerSettings: Map<String, String>? = null,
    val ratio: String? = null,
    val referenceAudio: List<Map<String, String>>? = null,
    val referenceVideos: List<Map<String, String>>? = null,
    val references: List<Map<String, String>>? = null,
    val resolution: String? = null,
    val seed: Int? = null
)
