package com.sdkwork.clawrouter.app

data class UsageLogsResponse(
    val logs: List<UsageLogItem>? = null,
    val page: String? = null,
    val pageSize: String? = null,
    val total: String? = null
)
