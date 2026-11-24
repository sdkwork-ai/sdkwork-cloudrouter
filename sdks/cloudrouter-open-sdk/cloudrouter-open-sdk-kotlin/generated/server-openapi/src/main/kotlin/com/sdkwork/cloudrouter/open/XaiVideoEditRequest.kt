package com.sdkwork.cloudrouter.open

data class XaiVideoEditRequest(
    val model: String? = null,
    val output: Map<String, String>? = null,
    val prompt: String,
    val storageOptions: Map<String, String>? = null,
    val user: String? = null,
    val video: XaiVideoInput
)
