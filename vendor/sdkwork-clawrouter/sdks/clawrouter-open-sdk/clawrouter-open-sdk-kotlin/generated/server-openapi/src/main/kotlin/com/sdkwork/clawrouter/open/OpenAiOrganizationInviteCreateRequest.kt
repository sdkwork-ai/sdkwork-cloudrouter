package com.sdkwork.clawrouter.open

data class OpenAiOrganizationInviteCreateRequest(
    val email: String? = null,
    val projects: List<String>? = null,
    val role: String? = null
)
