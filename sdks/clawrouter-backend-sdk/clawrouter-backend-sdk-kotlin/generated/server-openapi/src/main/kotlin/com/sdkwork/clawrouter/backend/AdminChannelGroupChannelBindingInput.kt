package com.sdkwork.clawrouter.backend

data class AdminChannelGroupChannelBindingInput(
    val apiScope: List<String>? = null,
    val capabilities: List<String>? = null,
    val channelId: String? = null,
    val priority: Int? = null,
    val resourceCodes: List<String>? = null,
    val status: String? = null,
    val weight: Int? = null
)
