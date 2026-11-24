package com.sdkwork.cloudrouter.open

data class OpenAiRealtimeCall(
    val createdAt: Int? = null,
    val id: String,
    val metadata: Map<String, String>? = null,
    val object_: String,
    val sdp: String? = null,
    val session: String? = null,
    val status: String
)
