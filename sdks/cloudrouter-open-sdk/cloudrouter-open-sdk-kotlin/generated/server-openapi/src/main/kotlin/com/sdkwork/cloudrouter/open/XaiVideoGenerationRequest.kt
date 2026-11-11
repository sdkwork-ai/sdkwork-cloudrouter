package com.sdkwork.cloudrouter.open

data class XaiVideoGenerationRequest(
    val aspectRatio: String? = null,
    val duration: Int? = null,
    val image: XaiImageUrl? = null,
    val keyframes: List<XaiImageUrl>? = null,
    val model: String? = null,
    val output: Map<String, String>? = null,
    val prompt: String? = null,
    val referenceAudios: List<String>? = null,
    val referenceImages: List<XaiImageUrl>? = null,
    val resolution: String? = null,
    val storageOptions: Map<String, String>? = null,
    val user: String? = null
)
