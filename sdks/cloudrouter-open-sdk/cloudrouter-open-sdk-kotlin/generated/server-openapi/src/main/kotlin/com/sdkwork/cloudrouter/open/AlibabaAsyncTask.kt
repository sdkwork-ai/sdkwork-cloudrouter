package com.sdkwork.cloudrouter.open

data class AlibabaAsyncTask(
    val code: String? = null,
    val endTime: String? = null,
    val message: String? = null,
    val origPrompt: String? = null,
    val results: List<ProviderGeneratedMedia>? = null,
    val scheduledTime: String? = null,
    val submitTime: String? = null,
    val taskId: String? = null,
    val taskStatus: String? = null,
    val videoUrl: String? = null
)
