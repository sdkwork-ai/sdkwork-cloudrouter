package com.sdkwork.cloudrouter.open

data class OpenAiUploadCreateRequest(
    val bytes: Int,
    val expiresAfter: Map<String, String>? = null,
    val filename: String,
    val mimeType: String,
    val purpose: String
)
