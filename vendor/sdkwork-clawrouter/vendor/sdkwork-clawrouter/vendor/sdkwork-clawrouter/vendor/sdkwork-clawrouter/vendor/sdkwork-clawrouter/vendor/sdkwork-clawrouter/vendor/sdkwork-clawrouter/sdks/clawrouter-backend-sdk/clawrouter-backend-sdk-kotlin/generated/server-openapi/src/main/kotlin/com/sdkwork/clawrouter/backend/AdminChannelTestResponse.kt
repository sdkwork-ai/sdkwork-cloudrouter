package com.sdkwork.clawrouter.backend

data class AdminChannelTestResponse(
    val channelId: String? = null,
    val item: AdminChannelItem? = null,
    val latency: String? = null,
    val status: String? = null,
    val success: Boolean? = null
)
