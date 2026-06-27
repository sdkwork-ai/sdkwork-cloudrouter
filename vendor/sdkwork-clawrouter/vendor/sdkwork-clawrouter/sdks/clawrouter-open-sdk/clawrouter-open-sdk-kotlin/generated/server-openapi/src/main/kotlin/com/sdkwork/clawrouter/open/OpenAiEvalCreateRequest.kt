package com.sdkwork.clawrouter.open

data class OpenAiEvalCreateRequest(
    val dataSource: String? = null,
    val dataSourceConfig: String? = null,
    val metadata: Map<String, String>? = null,
    val name: String? = null,
    val testingCriteria: List<String>? = null
)
