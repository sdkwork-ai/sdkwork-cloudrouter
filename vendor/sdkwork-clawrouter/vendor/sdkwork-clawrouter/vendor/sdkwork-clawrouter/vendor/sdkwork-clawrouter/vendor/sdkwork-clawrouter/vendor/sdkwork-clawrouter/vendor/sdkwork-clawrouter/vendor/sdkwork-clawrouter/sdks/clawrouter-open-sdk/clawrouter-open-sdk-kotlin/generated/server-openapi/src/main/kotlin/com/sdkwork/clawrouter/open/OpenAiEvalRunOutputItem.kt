package com.sdkwork.clawrouter.open

data class OpenAiEvalRunOutputItem(
    val createdAt: Int? = null,
    val evalId: String? = null,
    val id: String? = null,
    val metadata: Map<String, String>? = null,
    val object_: String? = null,
    val results: List<String>? = null,
    val runId: String? = null,
    val sample: String? = null,
    val status: String? = null
)
