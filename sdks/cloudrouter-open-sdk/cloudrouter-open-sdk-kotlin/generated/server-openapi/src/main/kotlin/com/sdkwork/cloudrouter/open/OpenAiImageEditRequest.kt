package com.sdkwork.cloudrouter.open

data class OpenAiImageEditRequest(
    val background: String? = null,
    val complexity: String? = null,
    val frameCount: Int? = null,
    val frameDurationMs: Int? = null,
    val images: List<OpenAiImageReferenceInput>? = null,
    val inputFidelity: String? = null,
    val markup: Map<String, String>? = null,
    val mask: Map<String, String>? = null,
    val model: String? = null,
    val moderation: String? = null,
    val n: Int? = null,
    val outputCompression: Int? = null,
    val outputFormat: String? = null,
    val partialImages: Int? = null,
    val prompt: String? = null,
    val quality: String? = null,
    val safetyIdentifier: String? = null,
    val size: String? = null,
    val stream: Boolean? = null,
    val svg: Map<String, String>? = null,
    val user: String? = null
)
