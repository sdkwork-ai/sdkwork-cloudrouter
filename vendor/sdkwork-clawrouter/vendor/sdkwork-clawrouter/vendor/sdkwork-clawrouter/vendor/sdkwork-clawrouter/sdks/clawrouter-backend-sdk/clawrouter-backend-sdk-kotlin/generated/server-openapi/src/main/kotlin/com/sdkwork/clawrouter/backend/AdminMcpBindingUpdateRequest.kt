package com.sdkwork.clawrouter.backend

data class AdminMcpBindingUpdateRequest(
    val allowedTools: List<String>? = null,
    val deniedTools: List<String>? = null,
    val enabled: Boolean? = null,
    val ownerId: String? = null,
    val ownerType: String? = null,
    val policyJson: Map<String, String>? = null,
    val priority: Int? = null,
    val serverRevisionId: String? = null,
    val status: String? = null,
    val toolId: String? = null
)
