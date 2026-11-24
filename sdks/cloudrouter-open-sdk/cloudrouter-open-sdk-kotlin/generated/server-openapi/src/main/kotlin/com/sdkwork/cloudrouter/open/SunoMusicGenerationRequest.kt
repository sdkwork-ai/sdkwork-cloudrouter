package com.sdkwork.cloudrouter.open

data class SunoMusicGenerationRequest(
    val callbackUrl: String? = null,
    val duration: Double? = null,
    val model: String? = null,
    val negativeTags: String? = null,
    val prompt: String,
    val tags: String? = null,
    val title: String? = null
)
