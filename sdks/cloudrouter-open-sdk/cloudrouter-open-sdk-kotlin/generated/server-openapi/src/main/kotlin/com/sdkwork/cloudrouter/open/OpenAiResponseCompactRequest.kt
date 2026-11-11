package com.sdkwork.cloudrouter.open

data class OpenAiResponseCompactRequest(
    val image: Map<String, String>? = null,
    val input: String? = null,
    val instructions: String? = null,
    val model: String? = null,
    val previousResponseId: String? = null,
    val promptCacheKey: String? = null,
    val promptCacheOptions: Map<String, String>? = null,
    val promptCacheRetention: String? = null,
    val serviceTier: String? = null
)
