package com.sdkwork.clawrouter.open

data class OpenAiFineTuningGraderValidationResult(
    val errors: List<String>? = null,
    val valid: Boolean? = null,
    val warnings: List<String>? = null
)
