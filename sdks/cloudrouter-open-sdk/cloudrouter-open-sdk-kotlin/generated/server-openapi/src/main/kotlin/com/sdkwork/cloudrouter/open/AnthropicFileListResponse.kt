package com.sdkwork.cloudrouter.open

data class AnthropicFileListResponse(
    val data_: List<AnthropicFile>,
    val firstId: String? = null,
    val hasMore: Boolean? = null,
    val lastId: String? = null
)
