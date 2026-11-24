package com.sdkwork.cloudrouter.open

data class XaiImageGenerationResponse(
    val data_: List<XaiGeneratedImage>,
    val usage: XaiUsage? = null
)
