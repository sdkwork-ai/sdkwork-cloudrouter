package com.sdkwork.clawrouter.backend

data class AdminServiceNodeUpdateRequest(
    val domain: String? = null,
    val ip: String? = null,
    val name: String? = null,
    val remark: String? = null
)
