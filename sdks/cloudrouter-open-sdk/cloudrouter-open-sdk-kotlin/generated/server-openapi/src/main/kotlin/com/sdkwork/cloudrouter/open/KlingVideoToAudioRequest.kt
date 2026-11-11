package com.sdkwork.cloudrouter.open

data class KlingVideoToAudioRequest(
    val asmrMode: Boolean? = null,
    val bgmPrompt: String? = null,
    val callbackUrl: String? = null,
    val externalTaskId: String? = null,
    val soundEffectPrompt: String? = null,
    val videoId: String? = null,
    val videoUrl: String? = null
)
