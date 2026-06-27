package com.sdkwork.clawrouter.open

data class OpenAiBatchList(
    val data_: List<OpenAiBatch>? = null,
    val firstId: String? = null,
    val hasMore: Boolean? = null,
    val lastId: String? = null,
    val object_: String? = null
)
