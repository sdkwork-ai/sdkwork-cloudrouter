package com.sdkwork.clawrouter.backend

data class AdminRateLimitItem(
    val blockDuration: String? = null,
    val burst: Int? = null,
    val channelGroup: String? = null,
    val channelGroupId: String? = null,
    val channelGroupName: String? = null,
    val id: String? = null,
    val keyPrefix: String? = null,
    val model: String? = null,
    val rpd: Int? = null,
    val rpm: Int? = null,
    val rps: Int? = null,
    val ruleName: String? = null,
    val status: String? = null,
    val targetIp: String? = null,
    val tpm: Int? = null,
    val user: String? = null
)
