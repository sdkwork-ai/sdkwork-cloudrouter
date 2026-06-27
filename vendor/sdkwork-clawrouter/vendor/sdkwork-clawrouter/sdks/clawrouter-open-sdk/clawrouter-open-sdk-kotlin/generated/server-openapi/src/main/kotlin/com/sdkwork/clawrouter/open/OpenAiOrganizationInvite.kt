package com.sdkwork.clawrouter.open

data class OpenAiOrganizationInvite(
    val createdAt: Int? = null,
    val email: String? = null,
    val expiresAt: Int? = null,
    val id: String? = null,
    val object_: String? = null,
    val projects: List<String>? = null,
    val role: String? = null,
    val status: String? = null
)
