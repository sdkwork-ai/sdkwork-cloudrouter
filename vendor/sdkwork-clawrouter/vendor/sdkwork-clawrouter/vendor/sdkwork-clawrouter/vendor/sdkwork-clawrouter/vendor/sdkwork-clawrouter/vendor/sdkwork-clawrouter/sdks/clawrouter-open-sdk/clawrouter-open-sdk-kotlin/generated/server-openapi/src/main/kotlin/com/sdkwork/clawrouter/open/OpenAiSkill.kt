package com.sdkwork.clawrouter.open

data class OpenAiSkill(
    val createdAt: Int? = null,
    val description: String? = null,
    val id: String? = null,
    val latestVersion: String? = null,
    val metadata: Map<String, String>? = null,
    val name: String? = null,
    val object_: String? = null,
    val status: String? = null,
    val updatedAt: Int? = null,
    val versions: List<OpenAiSkillVersion>? = null
)
