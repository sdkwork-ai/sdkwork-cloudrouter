package com.sdkwork.clawrouter.backend

data class AdminTokenLimitCreateRequest(
    val burst: Int? = null,
    val keyPrefix: String? = null,
    val rpd: Int? = null,
    val rps: Int? = null,
    val status: String? = null,
    val user: String? = null
)
