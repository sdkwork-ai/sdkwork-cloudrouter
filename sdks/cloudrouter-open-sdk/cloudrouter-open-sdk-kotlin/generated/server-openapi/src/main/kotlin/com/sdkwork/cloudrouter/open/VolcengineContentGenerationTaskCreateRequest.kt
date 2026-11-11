package com.sdkwork.cloudrouter.open

data class VolcengineContentGenerationTaskCreateRequest(
    val callbackUrl: String? = null,
    val cameraFixed: Boolean? = null,
    val content: List<VolcengineContentPart>? = null,
    val draft: Boolean? = null,
    val duration: Int? = null,
    val executionExpiresAfter: Int? = null,
    val frames: Int? = null,
    val generateAudio: Boolean? = null,
    val model: String? = null,
    val omniReferenceTaskType: String? = null,
    val outputFormat: String? = null,
    val priority: Int? = null,
    val ratio: String? = null,
    val resolution: String? = null,
    val returnLastFrame: Boolean? = null,
    val safetyIdentifier: String? = null,
    val seed: Int? = null,
    val serviceTier: String? = null,
    val tools: List<ArkWebSearchTool>? = null,
    val watermark: Boolean? = null
)
