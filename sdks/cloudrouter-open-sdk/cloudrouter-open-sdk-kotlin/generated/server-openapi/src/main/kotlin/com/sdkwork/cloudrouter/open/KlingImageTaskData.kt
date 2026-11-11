package com.sdkwork.cloudrouter.open

data class KlingImageTaskData(
    val createdAt: Int? = null,
    val taskId: String? = null,
    val taskInfo: Map<String, String>? = null,
    val taskResult: KlingImageTaskResult? = null,
    val taskStatus: String? = null,
    val taskStatusMsg: String? = null,
    val updatedAt: Int? = null
)
