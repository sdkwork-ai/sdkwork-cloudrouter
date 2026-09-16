package com.sdkwork.cloudrouter.open

data class MiniMaxMusicGenerationRequest(
    val audioSetting: MiniMaxMusicAudioSetting? = null,
    val isInstrumental: Boolean? = null,
    val lyrics: String? = null,
    val lyricsOptimizer: Boolean? = null,
    val model: String? = null,
    val outputFormat: String? = null,
    val prompt: String? = null,
    val stream: Boolean? = null
)
