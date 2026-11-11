package com.sdkwork.cloudrouter.open

data class AlibabaImageGenerationResponse(
    val code: String? = null,
    val message: String? = null,
    val output: AlibabaAsyncTask? = null,
    val requestId: String? = null,
    val usage: AlibabaTaskUsage? = null
)
