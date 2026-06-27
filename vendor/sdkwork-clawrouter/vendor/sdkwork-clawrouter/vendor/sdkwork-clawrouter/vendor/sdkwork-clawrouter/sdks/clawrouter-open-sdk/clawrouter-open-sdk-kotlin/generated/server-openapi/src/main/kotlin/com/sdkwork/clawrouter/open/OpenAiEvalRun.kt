package com.sdkwork.clawrouter.open

data class OpenAiEvalRun(
    val createdAt: Int? = null,
    val dataSource: String? = null,
    val evalId: String? = null,
    val id: String? = null,
    val metadata: Map<String, String>? = null,
    val name: String? = null,
    val object_: String? = null,
    val reportUrl: String? = null,
    val resultCounts: OpenAiEvalRunResultCounts? = null,
    val status: String? = null
)
