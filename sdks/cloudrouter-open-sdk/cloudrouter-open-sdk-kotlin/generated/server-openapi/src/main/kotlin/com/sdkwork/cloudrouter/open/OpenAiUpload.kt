package com.sdkwork.cloudrouter.open

data class OpenAiUpload(
    val bytes: Int,
    val createdAt: Int,
    val expiresAt: Int? = null,
    val file_: OpenAiFile? = null,
    val filename: String,
    val id: String,
    val object_: String,
    val purpose: String,
    val status: String
)
