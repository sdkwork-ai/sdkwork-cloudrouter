package com.sdkwork.cloudrouter.open

data class RunwayTask(
    val createdAt: String? = null,
    val failure: String? = null,
    val failureCode: String? = null,
    val id: String? = null,
    val output: List<String>? = null,
    val progress: Double? = null,
    val status: String? = null
)
