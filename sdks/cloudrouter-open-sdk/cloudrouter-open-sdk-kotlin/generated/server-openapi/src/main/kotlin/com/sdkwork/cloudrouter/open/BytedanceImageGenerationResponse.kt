package com.sdkwork.cloudrouter.open

data class BytedanceImageGenerationResponse(
    val created: Int? = null,
    val data_: List<ArkImageGenerationData>? = null,
    val error: ProviderTaskError? = null,
    val model: String? = null,
    val tools: List<ArkWebSearchTool>? = null,
    val usage: ArkImageUsage? = null
)
