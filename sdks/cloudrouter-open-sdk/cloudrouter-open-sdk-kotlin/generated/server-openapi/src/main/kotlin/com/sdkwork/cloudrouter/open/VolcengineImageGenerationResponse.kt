package com.sdkwork.cloudrouter.open

data class VolcengineImageGenerationResponse(
    val created: Int? = null,
    val data_: List<ArkImageGenerationData>? = null,
    val error: ProviderTaskError? = null,
    val model: String? = null,
    val tools: List<ArkWebSearchTool>? = null,
    val usage: ArkImageUsage? = null
)
