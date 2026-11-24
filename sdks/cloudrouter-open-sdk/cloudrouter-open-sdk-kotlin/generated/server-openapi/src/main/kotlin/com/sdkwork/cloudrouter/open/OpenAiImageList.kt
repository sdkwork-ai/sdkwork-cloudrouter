package com.sdkwork.cloudrouter.open

data class OpenAiImageList(
    val created: Int,
    val data_: List<OpenAiImage>,
    val usage: OpenAiTokenUsage? = null
)
