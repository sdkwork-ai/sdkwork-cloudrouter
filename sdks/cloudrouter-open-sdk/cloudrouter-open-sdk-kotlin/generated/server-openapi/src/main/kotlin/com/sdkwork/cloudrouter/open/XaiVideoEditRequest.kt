package com.sdkwork.cloudrouter.open

data class XaiVideoEditRequest(
    val model: String? = null,
    val output: Map<String, String>? = null,
    val prompt: String? = null,
    val storageOptions: Map<String, String>? = null,
    val user: String? = null,
    val video: XaiVideoInput? = null
)
