package com.sdkwork.clawrouter.backend

data class AdminMcpServerRevisionItem(
    val argsJson: List<String>? = null,
    val authType: String? = null,
    val command: String? = null,
    val configHash: String? = null,
    val createdAt: String? = null,
    val createdBy: String? = null,
    val deprecatedAt: String? = null,
    val endpointUrl: String? = null,
    val envSchema: Map<String, String>? = null,
    val id: String? = null,
    val lifecycleStatus: String? = null,
    val organizationId: String? = null,
    val publishedAt: String? = null,
    val retryPolicy: Map<String, String>? = null,
    val revisionNo: String? = null,
    val secretRef: String? = null,
    val serverId: String? = null,
    val status: String? = null,
    val tenantId: String? = null,
    val timeoutMs: Int? = null,
    val transport: String? = null,
    val updatedAt: String? = null,
    val uuid: String? = null
)
