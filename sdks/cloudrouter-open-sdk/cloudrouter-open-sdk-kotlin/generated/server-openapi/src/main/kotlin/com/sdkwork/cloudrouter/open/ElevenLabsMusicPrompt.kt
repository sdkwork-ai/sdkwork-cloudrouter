package com.sdkwork.cloudrouter.open

data class ElevenLabsMusicPrompt(
    val negativeGlobalStyles: List<String>,
    val positiveGlobalStyles: List<String>,
    val sections: List<Map<String, String>>
)
