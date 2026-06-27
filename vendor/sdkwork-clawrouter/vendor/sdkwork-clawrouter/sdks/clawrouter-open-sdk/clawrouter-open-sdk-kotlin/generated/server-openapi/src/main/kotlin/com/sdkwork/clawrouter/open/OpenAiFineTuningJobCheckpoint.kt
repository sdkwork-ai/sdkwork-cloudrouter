package com.sdkwork.clawrouter.open

data class OpenAiFineTuningJobCheckpoint(
    val createdAt: Int? = null,
    val fineTunedModelCheckpoint: String? = null,
    val fineTuningJobId: String? = null,
    val id: String? = null,
    val metrics: String? = null,
    val object_: String? = null,
    val stepNumber: Int? = null
)
