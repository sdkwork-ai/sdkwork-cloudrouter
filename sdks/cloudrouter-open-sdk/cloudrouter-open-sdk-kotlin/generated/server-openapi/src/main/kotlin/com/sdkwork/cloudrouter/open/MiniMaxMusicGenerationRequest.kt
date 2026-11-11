package com.sdkwork.cloudrouter.open

data class MiniMaxMusicGenerationRequest(
    val audioBase64: String? = null,
    val audioSetting: MiniMaxMusicAudioSetting? = null,
    val audioUrl: String? = null,
    val coverFeatureId: String? = null,
    val isInstrumental: Boolean? = null,
    val lyrics: String? = null,
    val lyricsOptimizer: Boolean? = null,
    val model: String? = null,
    val outputFormat: String? = null,
    val prompt: String? = null,
    val stream: Boolean? = null
)
