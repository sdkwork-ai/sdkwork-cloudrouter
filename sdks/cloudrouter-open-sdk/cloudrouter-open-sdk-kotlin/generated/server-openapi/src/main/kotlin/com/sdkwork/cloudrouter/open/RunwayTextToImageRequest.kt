package com.sdkwork.cloudrouter.open

data class RunwayTextToImageRequest(
    val background: String? = null,
    val backgroundColor: String? = null,
    val colors: List<String>? = null,
    val contentModeration: Map<String, String>? = null,
    val edit: Boolean? = null,
    val grounding: Boolean? = null,
    val maskUri: String? = null,
    val model: String? = null,
    val outputCount: Int? = null,
    val outputFormat: String? = null,
    val preciseEdit: Boolean? = null,
    val promptText: String? = null,
    val quality: String? = null,
    val ratio: String? = null,
    val referenceImages: List<Map<String, String>>? = null,
    val seed: Int? = null,
    val thinkingLevel: String? = null
)
