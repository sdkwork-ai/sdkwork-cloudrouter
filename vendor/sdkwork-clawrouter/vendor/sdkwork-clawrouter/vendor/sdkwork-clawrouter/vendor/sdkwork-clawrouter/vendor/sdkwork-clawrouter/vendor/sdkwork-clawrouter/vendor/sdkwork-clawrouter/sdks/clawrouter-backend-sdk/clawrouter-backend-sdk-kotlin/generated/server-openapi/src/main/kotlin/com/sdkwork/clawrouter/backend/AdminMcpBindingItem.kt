package com.sdkwork.clawrouter.backend

data class AdminMcpBindingItem(
    val allowedTools: List<String>? = null,
    val createdAt: String? = null,
    val deniedTools: List<String>? = null,
    val enabled: Boolean? = null,
    val id: String? = null,
    val organizationId: String? = null,
    val ownerId: String? = null,
    val ownerType: String? = null,
    val policyJson: Map<String, String>? = null,
    val priority: Int? = null,
    val serverId: String? = null,
    val serverRevisionId: String? = null,
    val snapshotJson: Map<String, String>? = null,
    val status: String? = null,
    val tenantId: String? = null,
    val toolId: String? = null,
    val updatedAt: String? = null,
    val uuid: String? = null
)
