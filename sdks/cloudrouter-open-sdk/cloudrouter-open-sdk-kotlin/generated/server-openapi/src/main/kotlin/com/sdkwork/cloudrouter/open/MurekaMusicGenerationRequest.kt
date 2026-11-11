package com.sdkwork.cloudrouter.open

data class MurekaMusicGenerationRequest(
    val callbackUrl: String? = null,
    val duration: Int? = null,
    val lyrics: String? = null,
    val model: String? = null,
    val prompt: String? = null,
    val referenceAudioUrl: String? = null,
    val tags: List<String>? = null,
    val title: String? = null
)
