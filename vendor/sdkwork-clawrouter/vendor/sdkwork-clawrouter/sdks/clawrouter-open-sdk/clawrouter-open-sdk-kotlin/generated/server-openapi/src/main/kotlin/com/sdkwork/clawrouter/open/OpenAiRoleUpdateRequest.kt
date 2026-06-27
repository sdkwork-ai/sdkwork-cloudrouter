package com.sdkwork.clawrouter.open

data class OpenAiRoleUpdateRequest(
    val description: String? = null,
    val name: String? = null,
    val permissions: List<String>? = null
)
