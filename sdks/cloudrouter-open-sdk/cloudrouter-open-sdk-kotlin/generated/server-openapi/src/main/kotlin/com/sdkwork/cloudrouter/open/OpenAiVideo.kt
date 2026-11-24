package com.sdkwork.cloudrouter.open

data class OpenAiVideo(
    val completedAt: Int? = null,
    val contentUrl: String? = null,
    val createdAt: Int? = null,
    val id: String,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val object_: String,
    val prompt: String? = null,
    val seconds: Int? = null,
    val size: String? = null,
    val status: String,
    val url: String? = null
)
