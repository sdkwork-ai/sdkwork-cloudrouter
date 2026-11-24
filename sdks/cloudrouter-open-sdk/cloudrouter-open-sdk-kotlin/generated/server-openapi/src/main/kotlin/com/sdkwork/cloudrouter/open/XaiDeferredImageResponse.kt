package com.sdkwork.cloudrouter.open

data class XaiDeferredImageResponse(
    val data_: List<XaiGeneratedImage>? = null,
    val error: Map<String, String>? = null,
    val requestId: String,
    val status: String,
    val usage: XaiUsage? = null
)
