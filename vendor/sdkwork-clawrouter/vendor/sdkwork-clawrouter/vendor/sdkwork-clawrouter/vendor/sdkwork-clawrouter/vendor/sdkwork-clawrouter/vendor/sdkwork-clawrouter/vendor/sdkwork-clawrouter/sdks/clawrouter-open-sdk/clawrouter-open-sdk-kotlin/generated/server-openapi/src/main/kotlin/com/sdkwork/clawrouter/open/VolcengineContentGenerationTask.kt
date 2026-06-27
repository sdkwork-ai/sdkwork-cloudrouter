package com.sdkwork.clawrouter.open

data class VolcengineContentGenerationTask(
    val content: List<VolcengineContentPart>? = null,
    val createdAt: String? = null,
    val error: ProviderTaskError? = null,
    val id: String? = null,
    val model: String? = null,
    val prompt: String? = null,
    val result: ProviderTaskResult? = null,
    val state: String? = null,
    val status: String? = null,
    val taskId: String? = null,
    val updatedAt: String? = null,
    val videos: List<ProviderGeneratedMedia>? = null
)
