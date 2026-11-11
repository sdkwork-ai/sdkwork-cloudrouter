package com.sdkwork.cloudrouter.open

data class ZhipuVideoGenerationTask(
    val created: Int? = null,
    val id: String? = null,
    val imageResult: List<ZhipuImageResult>? = null,
    val model: String? = null,
    val requestId: String? = null,
    val taskStatus: String? = null,
    val videoResult: List<ZhipuVideoResult>? = null
)
