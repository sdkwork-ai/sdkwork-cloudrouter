package com.sdkwork.clawrouter.open

data class OpenAiFineTuningJob(
    val createdAt: Int? = null,
    val error: String? = null,
    val fineTunedModel: String? = null,
    val finishedAt: Int? = null,
    val hyperparameters: String? = null,
    val id: String? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val object_: String? = null,
    val organizationId: String? = null,
    val resultFiles: List<String>? = null,
    val status: String? = null,
    val trainedTokens: Int? = null,
    val trainingFile: String? = null,
    val validationFile: String? = null
)
