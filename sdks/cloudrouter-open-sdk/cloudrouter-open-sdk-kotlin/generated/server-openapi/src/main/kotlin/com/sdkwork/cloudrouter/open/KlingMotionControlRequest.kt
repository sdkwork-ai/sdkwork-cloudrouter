package com.sdkwork.cloudrouter.open

data class KlingMotionControlRequest(
    val callbackUrl: String? = null,
    val image: String,
    val modelName: String? = null,
    val prompt: String? = null,
    val video: String
)
