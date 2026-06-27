package com.sdkwork.clawrouter.open

data class OpenAiFineTuningGraderRunRequest(
    val grader: String? = null,
    val input: String? = null,
    val modelSample: String? = null,
    val referenceAnswer: String? = null
)
