package com.sdkwork.cloudrouter.open

data class OpenAiVoiceConsentList(
    val data_: List<OpenAiVoiceConsent>,
    val firstId: String? = null,
    val hasMore: Boolean? = null,
    val lastId: String? = null,
    val object_: String
)
