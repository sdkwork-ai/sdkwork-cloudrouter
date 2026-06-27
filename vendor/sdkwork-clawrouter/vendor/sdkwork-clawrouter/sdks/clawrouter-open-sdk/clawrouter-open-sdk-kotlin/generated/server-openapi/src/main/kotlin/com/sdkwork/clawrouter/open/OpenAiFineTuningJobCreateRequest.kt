package com.sdkwork.clawrouter.open

data class OpenAiFineTuningJobCreateRequest(
    val hyperparameters: String? = null,
    val integrations: List<String>? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val seed: Int? = null,
    val suffix: String? = null,
    val trainingFile: String? = null,
    val validationFile: String? = null
)
