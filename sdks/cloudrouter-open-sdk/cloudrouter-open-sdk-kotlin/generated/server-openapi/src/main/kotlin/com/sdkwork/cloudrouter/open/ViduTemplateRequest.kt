package com.sdkwork.cloudrouter.open

data class ViduTemplateRequest(
    val callbackUrl: String? = null,
    val images: List<String>? = null,
    val payload: String? = null,
    val template: String? = null,
    val videoUrls: List<String>? = null
)
