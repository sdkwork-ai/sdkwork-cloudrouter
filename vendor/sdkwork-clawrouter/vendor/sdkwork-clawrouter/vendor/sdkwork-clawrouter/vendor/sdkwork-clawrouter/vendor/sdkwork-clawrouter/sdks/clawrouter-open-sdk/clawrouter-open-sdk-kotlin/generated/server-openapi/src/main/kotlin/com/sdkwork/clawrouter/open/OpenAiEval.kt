package com.sdkwork.clawrouter.open

data class OpenAiEval(
    val createdAt: Int? = null,
    val dataSourceConfig: String? = null,
    val id: String? = null,
    val metadata: Map<String, String>? = null,
    val name: String? = null,
    val object_: String? = null,
    val testingCriteria: List<String>? = null
)
