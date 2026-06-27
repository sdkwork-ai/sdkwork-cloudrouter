package com.sdkwork.clawrouter.backend

data class AdminServiceNodeCreateRequest(
    val domain: String? = null,
    val ip: String? = null,
    val name: String? = null,
    val remark: String? = null,
    val status: String? = null
)
