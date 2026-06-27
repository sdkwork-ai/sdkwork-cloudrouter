package com.sdkwork.clawrouter.open

data class OpenAiRoleCreateRequest(
    val description: String? = null,
    val name: String? = null,
    val permissions: List<String>? = null
)
