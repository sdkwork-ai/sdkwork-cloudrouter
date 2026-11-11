package com.sdkwork.cloudrouter.open

data class XaiVideoExtensionRequest(
    val duration: Int? = null,
    val model: String? = null,
    val output: Map<String, String>? = null,
    val prompt: String? = null,
    val storageOptions: Map<String, String>? = null,
    val video: XaiVideoInput? = null
)
