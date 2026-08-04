package com.sdkwork.cloudrouter.open

data class OpenAiUploadCreateRequest(
    val bytes: Int? = null,
    val filename: String? = null,
    val mimeType: String? = null,
    val purpose: String? = null
)
