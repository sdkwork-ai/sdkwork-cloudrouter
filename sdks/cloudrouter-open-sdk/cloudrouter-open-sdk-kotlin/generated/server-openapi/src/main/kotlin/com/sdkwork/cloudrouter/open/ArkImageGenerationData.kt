package com.sdkwork.cloudrouter.open

data class ArkImageGenerationData(
    val b64Json: String? = null,
    val boundingBox: Map<String, String>? = null,
    val description: String? = null,
    val error: ProviderTaskError? = null,
    val name: String? = null,
    val outputFormat: String? = null,
    val size: String? = null,
    val url: String? = null,
    val zIndex: Int? = null
)
