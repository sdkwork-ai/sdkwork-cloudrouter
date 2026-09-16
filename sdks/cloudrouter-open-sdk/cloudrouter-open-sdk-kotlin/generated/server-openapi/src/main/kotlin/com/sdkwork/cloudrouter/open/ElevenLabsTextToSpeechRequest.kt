package com.sdkwork.cloudrouter.open

data class ElevenLabsTextToSpeechRequest(
    val modelId: String? = null,
    val text: String? = null,
    val voiceSettings: Map<String, Any>? = null
)
