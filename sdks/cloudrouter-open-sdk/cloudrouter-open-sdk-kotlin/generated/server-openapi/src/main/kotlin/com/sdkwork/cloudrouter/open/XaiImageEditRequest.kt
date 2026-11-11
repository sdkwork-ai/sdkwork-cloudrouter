package com.sdkwork.cloudrouter.open

data class XaiImageEditRequest(
    val aspectRatio: String? = null,
    val deferred: Boolean? = null,
    val image: XaiImageUrl? = null,
    val images: List<XaiImageUrl>? = null,
    val model: String? = null,
    val n: Int? = null,
    val output: Map<String, String>? = null,
    val prompt: String? = null,
    val resolution: String? = null,
    val responseFormat: String? = null,
    val storageOptions: Map<String, String>? = null,
    val user: String? = null
)
