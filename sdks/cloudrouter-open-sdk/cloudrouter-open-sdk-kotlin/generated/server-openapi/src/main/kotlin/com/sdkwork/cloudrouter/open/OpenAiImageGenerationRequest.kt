package com.sdkwork.cloudrouter.open

data class OpenAiImageGenerationRequest(
    val background: String? = null,
    val complexity: String? = null,
    val frameCount: Int? = null,
    val frameDurationMs: Int? = null,
    val model: String? = null,
    val moderation: String? = null,
    val n: Int? = null,
    val outputCompression: Int? = null,
    val outputFormat: String? = null,
    val partialImages: Int? = null,
    val prompt: String? = null,
    val quality: String? = null,
    val responseFormat: String? = null,
    val safetyIdentifier: String? = null,
    val size: String? = null,
    val stream: Boolean? = null,
    val style: String? = null,
    val svg: Map<String, String>? = null,
    val user: String? = null
)
