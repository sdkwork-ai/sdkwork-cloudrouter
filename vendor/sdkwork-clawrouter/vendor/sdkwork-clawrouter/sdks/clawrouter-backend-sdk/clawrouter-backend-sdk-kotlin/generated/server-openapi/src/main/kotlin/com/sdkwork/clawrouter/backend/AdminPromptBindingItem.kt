package com.sdkwork.clawrouter.backend

data class AdminPromptBindingItem(
    val bindingRole: String? = null,
    val createdAt: String? = null,
    val enabled: Boolean? = null,
    val id: String? = null,
    val organizationId: String? = null,
    val ownerId: String? = null,
    val ownerType: String? = null,
    val policyJson: Map<String, String>? = null,
    val priority: Int? = null,
    val promptId: String? = null,
    val promptVersionId: String? = null,
    val snapshotJson: Map<String, String>? = null,
    val tenantId: String? = null,
    val updatedAt: String? = null,
    val uuid: String? = null
)
