package com.sdkwork.cloudrouter.open

data class OpenAiContainerFileList(
    val data_: List<OpenAiContainerFile>,
    val firstId: String? = null,
    val hasMore: Boolean? = null,
    val lastId: String? = null,
    val object_: String
)
