package com.sdkwork.cloudrouter.open

data class OpenAiVectorStoreFileBatch(
    val createdAt: Int,
    val fileCounts: OpenAiVectorStoreFileCounts? = null,
    val id: String,
    val object_: String,
    val status: String,
    val vectorStoreId: String
)
