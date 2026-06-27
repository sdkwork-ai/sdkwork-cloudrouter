package com.sdkwork.clawrouter.backend

data class AdminPromptVersionItem(
    val checksumHash: String? = null,
    val content: String? = null,
    val createdAt: String? = null,
    val createdBy: String? = null,
    val examplesJson: List<Map<String, String>>? = null,
    val id: String? = null,
    val lifecycleStatus: String? = null,
    val modelConstraints: Map<String, String>? = null,
    val organizationId: String? = null,
    val outputSchema: Map<String, String>? = null,
    val promptId: String? = null,
    val publishedAt: String? = null,
    val reviewComment: String? = null,
    val reviewStatus: String? = null,
    val safetyPolicy: Map<String, String>? = null,
    val tenantId: String? = null,
    val title: String? = null,
    val updatedAt: String? = null,
    val uuid: String? = null,
    val variableSchema: Map<String, String>? = null,
    val versionNo: String? = null
)
