package com.sdkwork.cloudrouter.open

data class AlibabaSpeechResponse(
    val code: String? = null,
    val message: String? = null,
    val output: Map<String, String>? = null,
    val requestId: String? = null,
    val usage: Map<String, String>? = null
)
