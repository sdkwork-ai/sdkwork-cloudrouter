package com.sdkwork.cloudrouter.open

data class MinimaxImageGenerationRequest(
    val aspectRatio: String? = null,
    val height: Int? = null,
    val model: String? = null,
    val n: Int? = null,
    val prompt: String? = null,
    val promptOptimizer: Boolean? = null,
    val responseFormat: String? = null,
    val seed: Int? = null,
    val subjectReference: List<Map<String, String>>? = null,
    val width: Int? = null
)
