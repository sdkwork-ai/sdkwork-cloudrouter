package com.sdkwork.cloudrouter.open

data class AlibabaSpeechRequest(
    val input: AlibabaSpeechInput,
    val model: String,
    val parameters: Map<String, String>? = null
)
