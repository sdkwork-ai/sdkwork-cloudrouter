package com.sdkwork.clawrouter.backend

data class AdminPromptCreateRequest(
    val categoryId: String? = null,
    val description: String? = null,
    val name: String? = null,
    val promptKey: String? = null,
    val promptType: String? = null,
    val tags: List<String>? = null,
    val visibility: String? = null
)
