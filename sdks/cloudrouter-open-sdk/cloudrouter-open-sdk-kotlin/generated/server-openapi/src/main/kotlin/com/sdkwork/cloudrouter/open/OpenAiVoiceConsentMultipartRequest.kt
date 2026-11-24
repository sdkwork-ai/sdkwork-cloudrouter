package com.sdkwork.cloudrouter.open

data class OpenAiVoiceConsentMultipartRequest(
    val file_: String,
    val metadata: Map<String, String>? = null,
    val name: String? = null
)
