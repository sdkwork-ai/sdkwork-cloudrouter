package com.sdkwork.clawrouter.backend

data class MediaAiProvenance(
    val generationTaskId: String? = null,
    val model: String? = null,
    val moderationStatus: String? = null,
    val promptId: String? = null,
    val provenance: String? = null,
    val provider: String? = null,
    val safetyLabels: List<String>? = null,
    val seed: String? = null,
    val sourceMediaIds: List<String>? = null
)
