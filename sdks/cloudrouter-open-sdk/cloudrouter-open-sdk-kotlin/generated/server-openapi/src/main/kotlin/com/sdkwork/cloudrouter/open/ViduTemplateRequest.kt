package com.sdkwork.cloudrouter.open

data class ViduTemplateRequest(
    val area: String? = null,
    val aspectRatio: String? = null,
    val beast: String? = null,
    val bgm: Boolean? = null,
    val callbackUrl: String? = null,
    val images: List<String>? = null,
    val metaData: String? = null,
    val offPeak: Boolean? = null,
    val payload: String? = null,
    val prompt: String? = null,
    val seed: Int? = null,
    val template: String? = null,
    val videoUrls: List<String>? = null,
    val watermark: Boolean? = null,
    val wmPosition: Int? = null,
    val wmUrl: String? = null
)
