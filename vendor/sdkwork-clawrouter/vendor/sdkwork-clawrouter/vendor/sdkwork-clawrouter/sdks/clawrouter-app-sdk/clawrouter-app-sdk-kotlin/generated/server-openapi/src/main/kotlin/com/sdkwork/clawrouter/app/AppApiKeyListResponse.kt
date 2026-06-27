package com.sdkwork.clawrouter.app

data class AppApiKeyListResponse(
    val groups: List<AppChannelGroup>? = null,
    val items: List<AppApiKeyItem>? = null
)
