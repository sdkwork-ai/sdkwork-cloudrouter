package com.sdkwork.clawrouter.open

data class OpenAiSkillUpdateRequest(
    val description: String? = null,
    val metadata: Map<String, String>? = null,
    val name: String? = null
)
