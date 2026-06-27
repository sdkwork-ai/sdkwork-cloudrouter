package com.sdkwork.clawrouter.open

data class OpenAiOrganizationAuditLog(
    val actor: String? = null,
    val apiKeyId: String? = null,
    val effectiveAt: Int? = null,
    val id: String? = null,
    val metadata: Map<String, String>? = null,
    val object_: String? = null,
    val project: String? = null,
    val request: String? = null,
    val type: String? = null
)
