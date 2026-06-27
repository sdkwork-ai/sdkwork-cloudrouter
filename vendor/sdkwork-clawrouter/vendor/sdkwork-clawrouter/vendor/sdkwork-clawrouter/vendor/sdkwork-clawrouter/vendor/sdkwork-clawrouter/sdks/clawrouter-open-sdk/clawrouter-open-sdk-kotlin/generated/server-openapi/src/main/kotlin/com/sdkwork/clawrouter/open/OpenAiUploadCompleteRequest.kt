package com.sdkwork.clawrouter.open

data class OpenAiUploadCompleteRequest(
    val md5: String? = null,
    val partIds: List<String>? = null
)
