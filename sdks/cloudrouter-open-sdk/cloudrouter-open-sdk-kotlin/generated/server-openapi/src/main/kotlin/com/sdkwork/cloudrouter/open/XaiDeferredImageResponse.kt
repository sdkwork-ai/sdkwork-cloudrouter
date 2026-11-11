package com.sdkwork.cloudrouter.open

data class XaiDeferredImageResponse(
    val data_: List<XaiGeneratedImage>? = null,
    val error: Map<String, String>? = null,
    val requestId: String? = null,
    val status: String? = null,
    val usage: XaiUsage? = null
)
