package com.sdkwork.cloudrouter.open

data class OpenAiVoiceConsentCreateRequest(
    val consentDocument: String? = null,
    val metadata: Map<String, String>? = null,
    val name: String? = null
)
