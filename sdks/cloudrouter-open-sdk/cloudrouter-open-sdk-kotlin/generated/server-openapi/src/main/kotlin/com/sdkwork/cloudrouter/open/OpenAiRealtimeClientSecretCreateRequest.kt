package com.sdkwork.cloudrouter.open

data class OpenAiRealtimeClientSecretCreateRequest(
    val expiresAfter: Map<String, String>? = null,
    val session: Map<String, String>? = null
)
