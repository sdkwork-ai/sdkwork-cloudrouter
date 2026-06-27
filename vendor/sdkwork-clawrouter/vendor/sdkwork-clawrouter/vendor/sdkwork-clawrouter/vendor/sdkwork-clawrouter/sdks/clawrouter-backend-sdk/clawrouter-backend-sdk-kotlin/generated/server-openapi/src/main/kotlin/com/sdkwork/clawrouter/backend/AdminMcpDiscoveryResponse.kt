package com.sdkwork.clawrouter.backend

data class AdminMcpDiscoveryResponse(
    val checkedAt: String? = null,
    val discoveredCount: String? = null,
    val serverId: String? = null,
    val tools: List<AdminMcpToolItem>? = null
)
