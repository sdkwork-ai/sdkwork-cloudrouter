package com.sdkwork.cloudrouter.open

data class BytedanceVideoGenerationTask(
    val content: ArkVideoTaskContent? = null,
    val createdAt: Int? = null,
    val draft: Boolean? = null,
    val duration: Int? = null,
    val error: ProviderTaskError? = null,
    val executionExpiresAfter: Int? = null,
    val frames: Int? = null,
    val framespersecond: Int? = null,
    val generateAudio: Boolean? = null,
    val id: String? = null,
    val model: String? = null,
    val outputFormat: String? = null,
    val priority: Int? = null,
    val ratio: String? = null,
    val resolution: String? = null,
    val safetyIdentifier: String? = null,
    val seed: Int? = null,
    val serviceTier: String? = null,
    val status: String? = null,
    val tools: List<ArkWebSearchTool>? = null,
    val updatedAt: Int? = null,
    val usage: ArkVideoUsage? = null
)
