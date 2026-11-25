package com.sdkwork.cloudrouter.open

data class OpenAiRunStepList(
    val data_: List<OpenAiRunStep>,
    val firstId: String? = null,
    val hasMore: Boolean? = null,
    val lastId: String? = null,
    val object_: String
)
