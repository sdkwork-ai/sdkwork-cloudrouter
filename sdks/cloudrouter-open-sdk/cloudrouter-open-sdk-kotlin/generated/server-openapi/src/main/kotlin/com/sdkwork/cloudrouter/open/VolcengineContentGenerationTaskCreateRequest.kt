package com.sdkwork.cloudrouter.open

data class VolcengineContentGenerationTaskCreateRequest(
    val callbackUrl: String? = null,
    val content: List<VolcengineContentPart>? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null
)
