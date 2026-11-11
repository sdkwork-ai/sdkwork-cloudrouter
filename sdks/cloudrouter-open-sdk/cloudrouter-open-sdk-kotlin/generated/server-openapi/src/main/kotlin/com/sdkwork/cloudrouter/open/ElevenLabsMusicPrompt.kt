package com.sdkwork.cloudrouter.open

data class ElevenLabsMusicPrompt(
    val negativeGlobalStyles: List<String>? = null,
    val positiveGlobalStyles: List<String>? = null,
    val sections: List<Map<String, String>>? = null
)
