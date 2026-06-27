package com.sdkwork.clawrouter.backend

data class AdminChannelGroupChannelBindingItem(
    val apiScope: List<String>? = null,
    val capabilities: List<String>? = null,
    val channelCode: String? = null,
    val channelGroupId: String? = null,
    val channelId: String? = null,
    val channelName: String? = null,
    val healthStatus: String? = null,
    val id: String? = null,
    val priority: Int? = null,
    val providerCode: String? = null,
    val providerName: String? = null,
    val resourceCodes: List<String>? = null,
    val status: String? = null,
    val weight: Int? = null
)
