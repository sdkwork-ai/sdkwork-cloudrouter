package com.sdkwork.clawrouter.backend

data class AdminRecordLogsResponse(
    val logs: List<AdminRecordLogItem>? = null,
    val page: String? = null,
    val pageSize: String? = null,
    val total: String? = null
)
