package com.sdkwork.cloudrouter.open

data class AlibabaSpeechRequest(
    val input: AlibabaSpeechInput? = null,
    val model: String? = null,
    val parameters: Map<String, String>? = null
)
