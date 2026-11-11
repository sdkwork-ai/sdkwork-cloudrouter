package com.sdkwork.cloudrouter.open

data class KlingImageGenerationRequest(
    val aspectRatio: String? = null,
    val callbackUrl: String? = null,
    val elementList: List<KlingElementReference>? = null,
    val externalTaskId: String? = null,
    val humanFidelity: Double? = null,
    val image: String? = null,
    val imageFidelity: Double? = null,
    val imageReference: String? = null,
    val modelName: String? = null,
    val n: Int? = null,
    val negativePrompt: String? = null,
    val prompt: String? = null,
    val resolution: String? = null,
    val watermarkInfo: KlingWatermarkInfo? = null
)
