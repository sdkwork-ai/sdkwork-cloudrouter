package com.sdkwork.clawrouter.backend

data class AdminMcpServerCreateRequest(
    val categoryId: String? = null,
    val description: String? = null,
    val name: String? = null,
    val serverKey: String? = null,
    val tags: List<String>? = null,
    val transport: String? = null,
    val visibility: String? = null
)
