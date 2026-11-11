package com.sdkwork.cloudrouter.open

data class LumaVideoGenerationTask(
    val assets: LumaGenerationAssets? = null,
    val createdAt: String? = null,
    val failureReason: String? = null,
    val generationType: String? = null,
    val id: String? = null,
    val model: String? = null,
    val request: Map<String, String>? = null,
    val state: String? = null
)
