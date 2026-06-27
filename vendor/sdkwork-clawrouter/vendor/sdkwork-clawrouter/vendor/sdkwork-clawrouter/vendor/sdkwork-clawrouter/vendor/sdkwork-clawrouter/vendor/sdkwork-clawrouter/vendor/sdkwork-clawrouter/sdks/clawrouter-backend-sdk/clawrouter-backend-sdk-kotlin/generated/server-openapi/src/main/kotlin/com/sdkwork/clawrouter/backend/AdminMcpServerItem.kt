package com.sdkwork.clawrouter.backend

data class AdminMcpServerItem(
    val categoryCode: String? = null,
    val categoryId: String? = null,
    val createdAt: String? = null,
    val deprecatedAt: String? = null,
    val description: String? = null,
    val healthStatus: String? = null,
    val id: String? = null,
    val lastCheckedAt: String? = null,
    val lastErrorMasked: String? = null,
    val latestRevisionId: String? = null,
    val name: String? = null,
    val organizationId: String? = null,
    val ownerUserId: String? = null,
    val publishedAt: String? = null,
    val publishedRevisionId: String? = null,
    val serverKey: String? = null,
    val status: String? = null,
    val tags: List<String>? = null,
    val tenantId: String? = null,
    val transport: String? = null,
    val updatedAt: String? = null,
    val uuid: String? = null,
    val visibility: String? = null
)
