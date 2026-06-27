package com.sdkwork.clawrouter.backend

data class AdminMcpToolUpdateRequest(
    val description: String? = null,
    val enabled: Boolean? = null,
    val inputSchema: Map<String, String>? = null,
    val name: String? = null,
    val outputSchema: Map<String, String>? = null,
    val rateLimitPolicy: Map<String, String>? = null,
    val requiresApproval: Boolean? = null,
    val riskLevel: String? = null,
    val sortWeight: Int? = null,
    val status: String? = null
)
