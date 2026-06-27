package com.sdkwork.clawrouter.open

data class OpenAiOrganizationUsageList(
    val data_: List<OpenAiOrganizationUsageBucket>? = null,
    val firstId: String? = null,
    val hasMore: Boolean? = null,
    val lastId: String? = null,
    val object_: String? = null
)
