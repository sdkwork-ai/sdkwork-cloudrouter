package com.sdkwork.cloudrouter.open

data class KlingMotionControlRequest(
    val modelName: String? = null,
    val prompt: String? = null,
    val image: String? = null,
    val video: String? = null,
    val callbackUrl: String? = null
)
