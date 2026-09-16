package com.sdkwork.cloudrouter.open

data class MiniMaxMusicGenerationRequest(
    val model: String? = null,
    val prompt: String? = null,
    val lyrics: String? = null,
    val stream: Boolean? = null,
    val outputFormat: String? = null,
    val isInstrumental: Boolean? = null,
    val lyricsOptimizer: Boolean? = null,
    val audioSetting: MiniMaxMusicAudioSetting? = null
)
