package com.sdkwork.cloudrouter.open

data class ArkImageUsage(
    val generatedImages: Int? = null,
    val inputImages: Int? = null,
    val outputTokens: Int? = null,
    val toolUsage: ArkVideoToolUsage? = null,
    val totalTokens: Int? = null
)
