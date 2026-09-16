package com.sdkwork.cloudrouter.open

data class KlingAvatarCreateRequest(
    val modelName: String? = null,
    val humanImage: String? = null,
    val prompt: String? = null,
    val voiceMode: String? = null,
    val audioUrl: String? = null,
    val text: String? = null,
    val voiceId: String? = null,
    val voiceLanguage: String? = null,
    val callbackUrl: String? = null
)
