package com.sdkwork.clawrouter.app

data class AppApiKeyItem(
    val channelGroup: String? = null,
    val channelGroupName: String? = null,
    val copyableKey: String? = null,
    val created: String? = null,
    val defaultForRuntime: Boolean? = null,
    val expires: String? = null,
    val id: String? = null,
    val ipLimit: String? = null,
    val maskedKey: String? = null,
    val modalities: List<String>? = null,
    val name: String? = null,
    val quota: String? = null,
    val rate: String? = null,
    val status: String? = null,
    val usedQuota: String? = null
)
