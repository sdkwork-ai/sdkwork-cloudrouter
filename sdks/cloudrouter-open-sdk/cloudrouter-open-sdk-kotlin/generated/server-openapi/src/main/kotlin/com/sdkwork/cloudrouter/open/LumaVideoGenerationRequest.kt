package com.sdkwork.cloudrouter.open

data class LumaVideoGenerationRequest(
    val aspectRatio: String? = null,
    val callbackUrl: String? = null,
    val concepts: List<LumaConcept>? = null,
    val duration: String? = null,
    val generationType: String? = null,
    val keyframes: LumaKeyframes? = null,
    val loop: Boolean? = null,
    val model: String? = null,
    val prompt: String? = null,
    val resolution: String? = null
)
