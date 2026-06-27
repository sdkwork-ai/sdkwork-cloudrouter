package com.sdkwork.clawrouter.open

data class SunoMusicGenerationTaskResponse(
    val createdAt: String? = null,
    val error: ProviderTaskError? = null,
    val id: String? = null,
    val status: String? = null,
    val taskId: String? = null,
    val title: String? = null,
    val tracks: List<SunoMusicTrack>? = null,
    val updatedAt: String? = null
)
