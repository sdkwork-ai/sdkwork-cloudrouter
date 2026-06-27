package com.sdkwork.clawrouter.open

data class ProviderTaskResult(
    val audios: List<ProviderGeneratedMedia>? = null,
    val content: List<VolcengineContentPart>? = null,
    val id: String? = null,
    val images: List<ProviderGeneratedMedia>? = null,
    val metadata: Map<String, String>? = null,
    val status: String? = null,
    val text: String? = null,
    val videos: List<ProviderGeneratedMedia>? = null
)
