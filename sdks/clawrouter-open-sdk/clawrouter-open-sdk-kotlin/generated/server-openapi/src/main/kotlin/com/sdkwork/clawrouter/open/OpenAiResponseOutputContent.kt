package com.sdkwork.clawrouter.open

data class OpenAiResponseOutputContent(
    val annotations: List<OpenAiAnnotation>? = null,
    val refusal: String? = null,
    val text: String? = null,
    val type: String? = null
)
