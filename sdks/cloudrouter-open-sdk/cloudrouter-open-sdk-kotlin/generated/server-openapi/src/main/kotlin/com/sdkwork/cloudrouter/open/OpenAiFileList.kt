package com.sdkwork.cloudrouter.open

data class OpenAiFileList(
    val data_: List<OpenAiFile>,
    val firstId: String? = null,
    val hasMore: Boolean? = null,
    val lastId: String? = null,
    val object_: String
)
