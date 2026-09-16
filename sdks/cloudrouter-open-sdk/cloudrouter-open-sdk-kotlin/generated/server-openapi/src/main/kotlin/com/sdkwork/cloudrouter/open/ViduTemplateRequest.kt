package com.sdkwork.cloudrouter.open

data class ViduTemplateRequest(
    val template: String? = null,
    val images: List<String>? = null,
    val videoUrls: List<String>? = null,
    val payload: String? = null,
    val callbackUrl: String? = null
)
