package com.sdkwork.cloudrouter.open

data class ArkContentPart(
    val audioUrl: ArkAudioSource? = null,
    val draftTask: ArkDraftTask? = null,
    val imageUrl: ArkImageSource? = null,
    val role: String? = null,
    val text: String? = null,
    val type: String,
    val videoUrl: ArkVideoSource? = null
)
