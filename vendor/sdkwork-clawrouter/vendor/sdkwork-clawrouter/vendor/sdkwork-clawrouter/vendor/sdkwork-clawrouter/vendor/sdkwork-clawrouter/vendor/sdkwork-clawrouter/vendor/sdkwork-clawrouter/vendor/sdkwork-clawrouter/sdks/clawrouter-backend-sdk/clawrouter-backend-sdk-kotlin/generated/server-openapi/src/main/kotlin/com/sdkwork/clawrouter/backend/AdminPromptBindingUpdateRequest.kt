package com.sdkwork.clawrouter.backend

data class AdminPromptBindingUpdateRequest(
    val bindingRole: String? = null,
    val enabled: Boolean? = null,
    val ownerId: String? = null,
    val ownerType: String? = null,
    val policyJson: Map<String, String>? = null,
    val priority: Int? = null,
    val promptVersionId: String? = null
)
