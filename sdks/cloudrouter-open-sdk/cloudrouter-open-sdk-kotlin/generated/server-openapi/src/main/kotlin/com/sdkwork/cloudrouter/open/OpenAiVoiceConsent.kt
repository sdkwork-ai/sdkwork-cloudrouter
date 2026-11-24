package com.sdkwork.cloudrouter.open

data class OpenAiVoiceConsent(
    val consentDocument: String? = null,
    val createdAt: Int? = null,
    val id: String,
    val metadata: Map<String, String>? = null,
    val name: String? = null,
    val object_: String,
    val status: String? = null
)
