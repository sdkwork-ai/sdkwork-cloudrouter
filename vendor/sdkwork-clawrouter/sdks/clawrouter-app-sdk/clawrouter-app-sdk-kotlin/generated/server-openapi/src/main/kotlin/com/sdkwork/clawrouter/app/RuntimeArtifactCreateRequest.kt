package com.sdkwork.clawrouter.app

data class RuntimeArtifactCreateRequest(
    val artifactType: String? = null,
    val contentJson: Map<String, String>? = null,
    val contentText: String? = null,
    val metadata: Map<String, String>? = null,
    val mimeType: String? = null,
    val name: String? = null,
    val resource: MediaResource? = null,
    val sha256: String? = null,
    val sizeBytes: String? = null,
    val storageKey: String? = null
)
