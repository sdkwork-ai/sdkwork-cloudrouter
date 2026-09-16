package com.sdkwork.cloudrouter.open

data class KlingAvatarCreateRequest(
    val audioUrl: String? = null,
    val callbackUrl: String? = null,
    val humanImage: String? = null,
    val modelName: String? = null,
    val prompt: String? = null,
    val text: String? = null,
    val voiceId: String? = null,
    val voiceLanguage: String? = null,
    val voiceMode: String? = null
)
