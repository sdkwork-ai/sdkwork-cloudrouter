package com.sdkwork.cloudrouter.open

data class AnthropicFile(
    val createdAt: String,
    val downloadable: Boolean? = null,
    val filename: String,
    val id: String,
    val mimeType: String,
    val sizeBytes: Int,
    val type: String
)
