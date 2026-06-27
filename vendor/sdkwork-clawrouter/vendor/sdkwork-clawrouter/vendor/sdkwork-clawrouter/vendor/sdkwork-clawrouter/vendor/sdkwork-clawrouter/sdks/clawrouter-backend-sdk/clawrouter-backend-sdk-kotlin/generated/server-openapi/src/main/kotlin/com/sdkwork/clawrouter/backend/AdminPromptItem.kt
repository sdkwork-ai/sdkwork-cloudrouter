package com.sdkwork.clawrouter.backend

data class AdminPromptItem(
    val categoryCode: String? = null,
    val categoryId: String? = null,
    val createdAt: String? = null,
    val description: String? = null,
    val id: String? = null,
    val latestVersionId: String? = null,
    val name: String? = null,
    val organizationId: String? = null,
    val ownerUserId: String? = null,
    val promptKey: String? = null,
    val promptType: String? = null,
    val publishedVersionId: String? = null,
    val status: String? = null,
    val tags: List<String>? = null,
    val tenantId: String? = null,
    val updatedAt: String? = null,
    val uuid: String? = null,
    val visibility: String? = null
)
