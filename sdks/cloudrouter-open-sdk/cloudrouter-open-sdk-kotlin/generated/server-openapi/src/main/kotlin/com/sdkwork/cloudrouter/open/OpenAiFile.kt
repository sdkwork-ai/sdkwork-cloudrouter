package com.sdkwork.cloudrouter.open

data class OpenAiFile(
    val bytes: Int,
    val createdAt: Int,
    val filename: String,
    val id: String,
    val object_: String,
    val purpose: String,
    val status: String? = null,
    val statusDetails: String? = null
)
