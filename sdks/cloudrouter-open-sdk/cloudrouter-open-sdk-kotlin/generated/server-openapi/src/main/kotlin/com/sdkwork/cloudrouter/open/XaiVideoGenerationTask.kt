package com.sdkwork.cloudrouter.open

data class XaiVideoGenerationTask(
    val error: Map<String, String>? = null,
    val model: String? = null,
    val progress: Int? = null,
    val requestId: String? = null,
    val status: String? = null,
    val usage: XaiUsage? = null,
    val video: XaiVideoUrl? = null
)
