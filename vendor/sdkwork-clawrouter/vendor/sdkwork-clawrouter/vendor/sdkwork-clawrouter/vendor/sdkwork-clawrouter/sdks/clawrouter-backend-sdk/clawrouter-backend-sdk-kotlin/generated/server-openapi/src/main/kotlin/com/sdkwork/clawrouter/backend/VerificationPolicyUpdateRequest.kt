package com.sdkwork.clawrouter.backend

data class VerificationPolicyUpdateRequest(
    val allowedChannels: List<String>? = null,
    val codeLength: Int? = null,
    val defaultChannel: String? = null,
    val maxSendPerHour: Int? = null,
    val maxVerifyAttempts: Int? = null,
    val resendIntervalSeconds: Int? = null,
    val riskPolicy: Map<String, String>? = null,
    val templateCode: String? = null,
    val ttlSeconds: Int? = null
)
