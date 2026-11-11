package com.sdkwork.cloudrouter.open

data class BytedanceImageGenerationRequest(
    val background: String? = null,
    val image: String? = null,
    val layerDecomposition: Boolean? = null,
    val model: String? = null,
    val optimizePromptOptions: Map<String, String>? = null,
    val outputFormat: String? = null,
    val prompt: String? = null,
    val responseFormat: String? = null,
    val sequentialImageGeneration: String? = null,
    val sequentialImageGenerationOptions: Map<String, String>? = null,
    val size: String? = null,
    val stream: Boolean? = null,
    val tools: List<ArkWebSearchTool>? = null,
    val watermark: Boolean? = null
)
