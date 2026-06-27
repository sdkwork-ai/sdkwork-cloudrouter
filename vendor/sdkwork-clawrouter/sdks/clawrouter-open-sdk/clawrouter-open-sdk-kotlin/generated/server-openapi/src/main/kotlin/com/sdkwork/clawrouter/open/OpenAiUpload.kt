package com.sdkwork.clawrouter.open

data class OpenAiUpload(
    val bytes: Int? = null,
    val createdAt: Int? = null,
    val expiresAt: Int? = null,
    val file_: OpenAiFile? = null,
    val filename: String? = null,
    val id: String? = null,
    val object_: String? = null,
    val purpose: String? = null,
    val status: String? = null
)
