package com.sdkwork.cloudrouter.open

data class AlibabaSpeechInput(
    val instructions: String? = null,
    val languageType: String? = null,
    val optimizeInstructions: Boolean? = null,
    val text: String,
    val voice: String
)
