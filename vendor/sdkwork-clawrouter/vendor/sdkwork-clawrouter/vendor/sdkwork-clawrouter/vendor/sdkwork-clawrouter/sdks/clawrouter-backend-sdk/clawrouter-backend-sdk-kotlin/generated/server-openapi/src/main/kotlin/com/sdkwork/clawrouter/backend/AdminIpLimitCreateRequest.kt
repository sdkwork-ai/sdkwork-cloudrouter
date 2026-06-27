package com.sdkwork.clawrouter.backend

data class AdminIpLimitCreateRequest(
    val blockDuration: String? = null,
    val rpm: Int? = null,
    val rps: Int? = null,
    val ruleName: String? = null,
    val status: String? = null,
    val targetIp: String? = null
)
