package com.sdkwork.clawrouter.open

data class ListFineTuningJobEventsItem(
    val created: Int? = null,
    val createdAt: Int? = null,
    val fineTunedModel: String? = null,
    val id: String? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val object_: String? = null,
    val resultFiles: List<String>? = null,
    val status: String? = null,
    val trainingFile: String? = null
)
