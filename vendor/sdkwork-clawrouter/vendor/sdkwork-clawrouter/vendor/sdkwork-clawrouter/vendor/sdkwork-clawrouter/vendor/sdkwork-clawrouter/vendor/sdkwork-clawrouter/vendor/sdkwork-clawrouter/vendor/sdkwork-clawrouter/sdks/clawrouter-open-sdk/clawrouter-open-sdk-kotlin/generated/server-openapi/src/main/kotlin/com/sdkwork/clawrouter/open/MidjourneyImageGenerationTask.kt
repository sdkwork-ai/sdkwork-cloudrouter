package com.sdkwork.clawrouter.open

data class MidjourneyImageGenerationTask(
    val createdAt: String? = null,
    val error: ProviderTaskError? = null,
    val id: String? = null,
    val images: List<ProviderGeneratedMedia>? = null,
    val model: String? = null,
    val prompt: String? = null,
    val state: String? = null,
    val status: String? = null,
    val taskId: String? = null,
    val updatedAt: String? = null
)
