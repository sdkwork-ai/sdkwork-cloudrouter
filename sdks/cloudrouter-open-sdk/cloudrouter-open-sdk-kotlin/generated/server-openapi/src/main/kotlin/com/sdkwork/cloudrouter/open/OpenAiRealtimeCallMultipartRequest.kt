package com.sdkwork.cloudrouter.open

data class OpenAiRealtimeCallMultipartRequest(
    val sdp: String,
    val session: String? = null
)
