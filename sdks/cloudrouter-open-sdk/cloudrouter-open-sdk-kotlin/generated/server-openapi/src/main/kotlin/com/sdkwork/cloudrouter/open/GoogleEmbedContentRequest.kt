package com.sdkwork.cloudrouter.open

data class GoogleEmbedContentRequest(
    val content: GoogleContent? = null,
    val embedContentConfig: Map<String, String>? = null,
    val model: String? = null,
    val outputDimensionality: Int? = null,
    val taskType: String? = null,
    val title: String? = null
)
